import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from ..config import app_config
from ..errors import ImageNotFoundError

_client = None


def _get_s3_client():
    global _client
    if _client is None:
        s3_config = app_config["s3"]
        _client = boto3.client(
            "s3",
            region_name=s3_config["region"],
            endpoint_url=s3_config["endpoint"],
            aws_access_key_id=s3_config["access_key_id"],
            aws_secret_access_key=s3_config["secret_access_key"],
            # localstack serves buckets by path, not by subdomain
            config=Config(s3={"addressing_style": "path"}),
        )
    return _client


def download_object(key: str) -> bytes:
    try:
        response = _get_s3_client().get_object(
            Bucket=app_config["s3"]["bucket"], Key=key)
    except ClientError as error:
        if error.response["Error"]["Code"] in ("NoSuchKey", "NoSuchBucket", "404"):
            raise ImageNotFoundError(
                f"No object for key {key} in bucket "
                f"{app_config['s3']['bucket']}") from error
        raise
    return response["Body"].read()
