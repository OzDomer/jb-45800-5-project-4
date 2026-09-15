import os


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


app_config = {
    "sqs": {
        "region": _env("SQS_REGION", "us-east-1"),
        "endpoint": _env("SQS_ENDPOINT", "http://localhost:4566"),
        "access_key_id": _env("AWS_ACCESS_KEY_ID", "test"),
        "secret_access_key": _env("AWS_SECRET_ACCESS_KEY", "test"),
        "queues": {
            "jobs": _env("SQS_QUEUE_JOBS", "inference-jobs-queue"),
            "results": _env("SQS_QUEUE_RESULTS", "inference-results-queue"),
        },
        "visibility_timeout_seconds": int(_env("SQS_VISIBILITY_TIMEOUT_SECONDS", "60")),
        "wait_time_seconds": int(_env("SQS_WAIT_TIME_SECONDS", "20")),
        "poll_interval_ms": int(_env("SQS_POLL_INTERVAL_MS", "500")),
        "max_receive_count": int(_env("SQS_MAX_RECEIVE_COUNT", "5")),
    },
    "s3": {
        "region": _env("S3_REGION", "us-east-1"),
        "endpoint": _env("S3_ENDPOINT", "http://localhost:4566"),
        "access_key_id": _env("AWS_ACCESS_KEY_ID", "test"),
        "secret_access_key": _env("AWS_SECRET_ACCESS_KEY", "test"),
        "bucket": _env("S3_BUCKET", "pet-expressions"),
    },
    "db": {
        "host": _env("DB_HOST", "localhost"),
        "port": int(_env("DB_PORT", "3306")),
        "user": _env("DB_USER", "root"),
        "password": _env("DB_PASSWORD", ""),
        "database": _env("DB_NAME", "pet_expressions"),
    },
    "model": {
        "path": _env("MODEL_PATH", "model.pt"),
    },
}
