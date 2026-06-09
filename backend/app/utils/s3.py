import boto3
from botocore.exceptions import ClientError

from app.config import get_settings

PRESIGNED_UPLOAD_EXPIRY = 900
PRESIGNED_DOWNLOAD_EXPIRY = 900


def _get_s3_client():
    settings = get_settings()
    kwargs: dict = {"region_name": settings.AWS_REGION}
    if settings.AWS_ACCESS_KEY_ID:
        kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
    if settings.AWS_SECRET_ACCESS_KEY:
        kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
    if settings.S3_ENDPOINT_URL:
        kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
    return boto3.client("s3", **kwargs)


def generate_presigned_upload_url(
    bucket: str,
    key: str,
    content_type: str,
    max_size: int,
) -> str:
    client = _get_s3_client()
    return client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": bucket,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=PRESIGNED_UPLOAD_EXPIRY,
    )


def generate_presigned_download_url(
    bucket: str,
    key: str,
    expires_in: int = PRESIGNED_DOWNLOAD_EXPIRY,
) -> str:
    client = _get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires_in,
    )


def object_exists(bucket: str, key: str) -> bool:
    client = _get_s3_client()
    try:
        client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError:
        return False


def get_object_metadata(bucket: str, key: str) -> dict:
    client = _get_s3_client()
    try:
        response = client.head_object(Bucket=bucket, Key=key)
        return {
            "ContentLength": response.get("ContentLength", 0),
            "ContentType": response.get("ContentType"),
        }
    except ClientError as exc:
        raise exc
