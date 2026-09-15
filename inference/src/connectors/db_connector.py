import json

import pymysql

from ..config import app_config

_connection = None


def _get_connection():
    global _connection
    if _connection is None:
        db_config = app_config["db"]
        _connection = pymysql.connect(
            host=db_config["host"],
            port=db_config["port"],
            user=db_config["user"],
            password=db_config["password"],
            database=db_config["database"],
            autocommit=True,
            cursorclass=pymysql.cursors.DictCursor,
        )
    # Reconnect if MySQL dropped the connection since the last job.
    _connection.ping(reconnect=True)
    return _connection


def fetch_job(job_id: str):
    with _get_connection().cursor() as cursor:
        cursor.execute(
            "SELECT id, image_key, status FROM jobs WHERE id = %s", (job_id,))
        return cursor.fetchone()


def mark_job_done(job_id: str, label: str, confidence: float,
                  probabilities: dict) -> None:
    with _get_connection().cursor() as cursor:
        cursor.execute(
            "UPDATE jobs SET status = 'done', label = %s, confidence = %s, "
            "probabilities = %s, error = NULL WHERE id = %s",
            (label, confidence, json.dumps(probabilities), job_id))


def mark_job_failed(job_id: str, error: str) -> None:
    with _get_connection().cursor() as cursor:
        cursor.execute(
            "UPDATE jobs SET status = 'failed', error = %s WHERE id = %s",
            (error, job_id))
