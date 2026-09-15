"""The at-least-once contract in worker.process_job:

- a redelivered message for a finished (done/failed) row skips inference
  entirely and re-sends the results pointer
- for a pending row, the jobs row is updated BEFORE the pointer is sent --
  the backend must always find a terminal row when it reads
"""

import logging
import sys
import unittest
from unittest.mock import MagicMock, patch

# worker.py imports predictor (torch/PIL) and db_connector (pymysql); these
# tests patch all of them out, so stub the heavy modules before the import
# -- this is what lets CI run on bare python + boto3, no torch install
for _name in ("torch", "torch.nn", "PIL", "torchvision", "torchvision.models",
              "torchvision.transforms", "pymysql", "pymysql.cursors"):
    sys.modules.setdefault(_name, MagicMock())

from src.worker import process_job  # noqa: E402


def setUpModule():
    logging.disable(logging.CRITICAL)


def tearDownModule():
    logging.disable(logging.NOTSET)


def job_row(status: str) -> dict:
    return {"id": "job-1", "image_key": "key.jpg", "status": status}


class ProcessJobContractTest(unittest.TestCase):

    def test_finished_row_skips_inference_and_resends_pointer(self):
        for status in ("done", "failed"):
            with self.subTest(status=status), \
                 patch("src.worker.db_connector") as db, \
                 patch("src.worker.predictor") as predictor, \
                 patch("src.worker.download_object") as download, \
                 patch("src.worker.notify_backend") as notify:
                db.fetch_job.return_value = job_row(status)

                process_job("job-1")

                download.assert_not_called()
                predictor.predict.assert_not_called()
                db.mark_job_done.assert_not_called()
                notify.assert_called_once_with("job-1")

    def test_row_is_updated_before_the_pointer_is_sent(self):
        calls = []
        with patch("src.worker.db_connector") as db, \
             patch("src.worker.predictor") as predictor, \
             patch("src.worker.download_object", return_value=b"image-bytes"), \
             patch("src.worker.send_queue_message") as send:
            db.fetch_job.return_value = job_row("pending")
            predictor.predict.return_value = ("happy", 0.9, {"happy": 0.9})
            db.mark_job_done.side_effect = lambda *a: calls.append("mark_done")
            send.side_effect = lambda *a: calls.append("send_pointer")

            process_job("job-1")

            predictor.predict.assert_called_once_with(b"image-bytes")
            db.mark_job_done.assert_called_once_with(
                "job-1", "happy", 0.9, {"happy": 0.9})
            self.assertEqual(calls, ["mark_done", "send_pointer"],
                             "the pointer must never leave before the row is terminal")


if __name__ == "__main__":
    unittest.main()
