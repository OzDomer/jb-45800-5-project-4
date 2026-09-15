import json

import boto3
from botocore.exceptions import ClientError

from ..config import app_config
from ..logger import logger

_client = None
_queue_urls: dict[str, str] = {}

_NON_EXISTENT_CODES = (
    "AWS.SimpleQueueService.NonExistentQueue",
    "QueueDoesNotExist",
    "NonExistentQueue",
)


def _get_sqs_client():
    global _client
    if _client is None:
        sqs_config = app_config["sqs"]
        _client = boto3.client(
            "sqs",
            region_name=sqs_config["region"],
            endpoint_url=sqs_config["endpoint"],
            aws_access_key_id=sqs_config["access_key_id"],
            aws_secret_access_key=sqs_config["secret_access_key"],
        )
    return _client


def _get_queue_arn(queue_url: str) -> str:
    response = _get_sqs_client().get_queue_attributes(
        QueueUrl=queue_url, AttributeNames=["QueueArn"])
    return response["Attributes"]["QueueArn"]


def ensure_queue_exists(queue_name: str, is_dlq: bool = False) -> str:
    cached = _queue_urls.get(queue_name)
    if cached:
        return cached

    sqs = _get_sqs_client()

    try:
        response = sqs.get_queue_url(QueueName=queue_name)
        _queue_urls[queue_name] = response["QueueUrl"]
        return response["QueueUrl"]
    except ClientError as error:
        if error.response["Error"]["Code"] not in _NON_EXISTENT_CODES:
            raise

    attributes = {}
    if not is_dlq:
        # The DLQ must exist before the main queue -- the redrive policy
        # references its ARN. A poison message stops cycling after
        # max_receive_count receives and lands there instead.
        dlq_url = ensure_queue_exists(f"{queue_name}-dlq", is_dlq=True)
        attributes["VisibilityTimeout"] = str(
            app_config["sqs"]["visibility_timeout_seconds"])
        attributes["RedrivePolicy"] = json.dumps({
            "deadLetterTargetArn": _get_queue_arn(dlq_url),
            "maxReceiveCount": app_config["sqs"]["max_receive_count"],
        })

    try:
        response = sqs.create_queue(QueueName=queue_name, Attributes=attributes)
        logger.info(f"Created SQS queue: {queue_name}")
    except ClientError as error:
        if error.response["Error"]["Code"] not in ("QueueNameExists", "QueueAlreadyExists"):
            raise
        response = sqs.get_queue_url(QueueName=queue_name)

    _queue_urls[queue_name] = response["QueueUrl"]
    return response["QueueUrl"]


def send_queue_message(queue_name: str, body: str):
    url = ensure_queue_exists(queue_name)
    response = _get_sqs_client().send_message(QueueUrl=url, MessageBody=body)
    return response.get("MessageId")


def receive_queue_messages(queue_name: str, max_messages: int = 1) -> list:
    url = ensure_queue_exists(queue_name)
    sqs_config = app_config["sqs"]
    response = _get_sqs_client().receive_message(
        QueueUrl=url,
        MaxNumberOfMessages=max_messages,
        WaitTimeSeconds=sqs_config["wait_time_seconds"],
        VisibilityTimeout=sqs_config["visibility_timeout_seconds"],
    )
    return response.get("Messages", [])


def delete_queue_message(queue_name: str, receipt_handle: str) -> None:
    url = ensure_queue_exists(queue_name)
    _get_sqs_client().delete_message(QueueUrl=url, ReceiptHandle=receipt_handle)
