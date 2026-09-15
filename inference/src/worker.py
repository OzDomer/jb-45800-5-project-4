import json
import sys
import traceback

from .config import app_config
from .connectors import db_connector
from .connectors.s3_connector import download_object
from .connectors.sqs_connector import ensure_queue_exists, send_queue_message
from .errors import JobRowNotFoundError
from .inference_worker import create_inference_worker
from .logger import log_error, logger
from .services import predictor

JOBS_QUEUE = app_config["sqs"]["queues"]["jobs"]
RESULTS_QUEUE = app_config["sqs"]["queues"]["results"]


def notify_backend(job_id: str) -> None:
    # The results message is a POINTER -- the result itself lives in MySQL,
    # and the backend reads the row before emitting to the browser.
    send_queue_message(RESULTS_QUEUE, json.dumps({"jobId": job_id}))


def process_job(job_id: str) -> None:
    job = db_connector.fetch_job(job_id)
    if job is None:
        raise JobRowNotFoundError(f"No jobs row for id {job_id}")

    if job["status"] in ("done", "failed"):
        # SQS is at-least-once -- a redelivered message for a finished job
        # must not re-run inference. Re-send the pointer in case the first
        # send never happened, then let the loop delete the message.
        logger.info(f"[inference] Job {job_id} already {job['status']}, skipping")
        notify_backend(job_id)
        return

    image_bytes = download_object(job["image_key"])
    label, confidence, probabilities = predictor.predict(image_bytes)

    # The row is updated BEFORE the pointer is sent -- the backend must
    # always find a terminal row when it reads.
    db_connector.mark_job_done(job_id, label, confidence, probabilities)
    notify_backend(job_id)
    logger.info(f"[inference] Job {job_id} done: {label} ({confidence:.1%})")


def record_permanent_failure(job_id: str, error: Exception) -> None:
    db_connector.mark_job_failed(
        job_id, "".join(traceback.format_exception(error)))
    notify_backend(job_id)


def start() -> None:
    ensure_queue_exists(JOBS_QUEUE)
    ensure_queue_exists(RESULTS_QUEUE)
    predictor.load_model()

    worker = create_inference_worker(
        worker_name="inference",
        queue_name=JOBS_QUEUE,
        process_job=process_job,
        on_permanent_failure=record_permanent_failure,
    )
    worker.start()


if __name__ == "__main__":
    try:
        start()
    except Exception as error:
        log_error("Failed to start worker", error)
        sys.exit(1)
