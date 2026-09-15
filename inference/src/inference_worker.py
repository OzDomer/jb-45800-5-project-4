import json
import time
from types import SimpleNamespace

from .config import app_config
from .connectors.sqs_connector import delete_queue_message, receive_queue_messages
from .errors import DeterministicJobError
from .logger import log_error, logger


def create_inference_worker(worker_name: str, queue_name: str,
                            process_job, on_permanent_failure):
    running = False

    def poll_once() -> bool:
        logger.info(f"[{worker_name}] Fetching message from queue {queue_name}...")

        messages = receive_queue_messages(queue_name, 1)
        for message in messages:
            body = message.get("Body")
            receipt_handle = message.get("ReceiptHandle")
            if not body or not receipt_handle:
                continue

            try:
                job_id = json.loads(body)["jobId"]
            except (ValueError, KeyError) as error:
                # No jobId means there is no row to mark and retrying can
                # never help -- drop the poison message.
                log_error(f"[{worker_name}] Malformed message body: {body}", error)
                delete_queue_message(queue_name, receipt_handle)
                continue

            logger.info(
                f"[{worker_name}] Received message for job {job_id} "
                f"(sqsMessageId={message.get('MessageId', 'unknown')})")

            try:
                process_job(job_id)
                delete_queue_message(queue_name, receipt_handle)
                logger.info(
                    f"[{worker_name}] Job {job_id} processed. "
                    f"Deleted message from queue.")
            except DeterministicJobError as error:
                # Retrying can never fix these -- record the failure and
                # drop the message.
                log_error(f"[{worker_name}] Job {job_id} failed permanently", error)
                try:
                    on_permanent_failure(job_id, error)
                    delete_queue_message(queue_name, receipt_handle)
                    logger.info(
                        f"[{worker_name}] Job {job_id} marked failed. "
                        f"Deleted message from queue.")
                except Exception as failure_error:
                    # Could not record the failure (db/queue down) -- leave
                    # the message; it comes back after the visibility timeout.
                    log_error(
                        f"[{worker_name}] Could not record failure for "
                        f"job {job_id}", failure_error)
            except Exception as error:
                # Transient (MySQL/S3/SQS unreachable): leave the message --
                # redelivered after the visibility timeout, dead-lettered
                # after max_receive_count receives.
                log_error(f"[{worker_name}] Job {job_id} failed, will retry", error)

        return len(messages) > 0

    def poll_loop() -> None:
        while running:
            handled = False
            try:
                handled = poll_once()
            except Exception as error:
                log_error(f"[{worker_name}] Failed to fetch message from queue", error)

            # A busy queue is drained back-to-back -- long polling is the
            # throttle when it is empty, the sleep only breaks a hot loop
            # when the receive itself keeps failing.
            if not handled:
                time.sleep(app_config["sqs"]["poll_interval_ms"] / 1000)

    def start() -> None:
        nonlocal running
        if running:
            return
        running = True
        logger.info(f"[{worker_name}] Worker started (queue: {queue_name})")
        poll_loop()

    def stop() -> None:
        nonlocal running
        running = False

    return SimpleNamespace(start=start, stop=stop)
