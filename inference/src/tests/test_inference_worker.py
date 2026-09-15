"""The poll loop's failure-handling contract, driven through the poll_once
test seam with the SQS connector patched out:

- deterministic failures record the failure and DELETE the message
- transient failures leave the message for redelivery
- poison messages (unparseable / no jobId) are deleted without processing
- the return value reports whether anything was handled (the drain signal)
"""

import json
import logging
import unittest
from unittest.mock import patch

from src.errors import DeterministicJobError
from src.inference_worker import create_inference_worker


def setUpModule():
    # the worker logs every failure it handles -- expected noise in tests
    logging.disable(logging.CRITICAL)


def tearDownModule():
    logging.disable(logging.NOTSET)


def message(body: str) -> dict:
    return {"Body": body, "ReceiptHandle": "receipt-1", "MessageId": "message-1"}


def job_message(job_id: str = "job-1") -> dict:
    return message(json.dumps({"jobId": job_id}))


class Recorder:
    def __init__(self, process_error: Exception | None = None,
                 failure_error: Exception | None = None):
        self.processed: list[str] = []
        self.failures: list[str] = []
        self._process_error = process_error
        self._failure_error = failure_error

    def process_job(self, job_id: str) -> None:
        self.processed.append(job_id)
        if self._process_error is not None:
            raise self._process_error

    def on_permanent_failure(self, job_id: str, error: Exception) -> None:
        self.failures.append(job_id)
        if self._failure_error is not None:
            raise self._failure_error


class InferenceWorkerPollTest(unittest.TestCase):

    def poll(self, recorder: Recorder, messages: list[dict]):
        worker = create_inference_worker(
            worker_name="test",
            queue_name="test-queue",
            process_job=recorder.process_job,
            on_permanent_failure=recorder.on_permanent_failure,
        )
        with patch("src.inference_worker.receive_queue_messages",
                   return_value=messages), \
             patch("src.inference_worker.delete_queue_message") as delete:
            handled = worker.poll_once()
        return handled, delete

    def test_successful_job_is_deleted(self):
        recorder = Recorder()
        handled, delete = self.poll(recorder, [job_message()])

        self.assertEqual(recorder.processed, ["job-1"])
        self.assertEqual(recorder.failures, [])
        delete.assert_called_once_with("test-queue", "receipt-1")
        self.assertTrue(handled)

    def test_deterministic_failure_is_recorded_and_deleted(self):
        recorder = Recorder(process_error=DeterministicJobError("bad image"))
        handled, delete = self.poll(recorder, [job_message()])

        self.assertEqual(recorder.failures, ["job-1"])
        delete.assert_called_once_with("test-queue", "receipt-1")
        self.assertTrue(handled)

    def test_transient_failure_leaves_the_message(self):
        recorder = Recorder(process_error=ConnectionError("mysql is down"))
        handled, delete = self.poll(recorder, [job_message()])

        self.assertEqual(recorder.failures, [],
                         "a transient failure must NOT be marked permanent")
        delete.assert_not_called()
        self.assertTrue(handled)

    def test_unrecordable_failure_leaves_the_message(self):
        # marking the job failed itself fails (db down) -- the message must
        # survive so the failure is recorded on a later delivery
        recorder = Recorder(process_error=DeterministicJobError("bad image"),
                            failure_error=ConnectionError("mysql is down"))
        handled, delete = self.poll(recorder, [job_message()])

        delete.assert_not_called()
        self.assertTrue(handled)

    def test_unparseable_body_is_deleted_without_processing(self):
        recorder = Recorder()
        handled, delete = self.poll(recorder, [message("{jobId:")])

        self.assertEqual(recorder.processed, [])
        self.assertEqual(recorder.failures, [])
        delete.assert_called_once_with("test-queue", "receipt-1")

    def test_body_without_job_id_is_deleted_without_processing(self):
        recorder = Recorder()
        handled, delete = self.poll(recorder, [message(json.dumps({"other": 1}))])

        self.assertEqual(recorder.processed, [])
        delete.assert_called_once_with("test-queue", "receipt-1")

    def test_message_without_receipt_handle_is_skipped(self):
        recorder = Recorder()
        handled, delete = self.poll(
            recorder, [{"Body": json.dumps({"jobId": "job-1"}), "MessageId": "m"}])

        self.assertEqual(recorder.processed, [])
        delete.assert_not_called()

    def test_empty_receive_reports_nothing_handled(self):
        recorder = Recorder()
        handled, delete = self.poll(recorder, [])

        self.assertFalse(handled, "empty poll must report False so the loop sleeps")
        delete.assert_not_called()


if __name__ == "__main__":
    unittest.main()
