import boto3
from botocore.config import Config
from app.core.config import settings

class R2StorageService:
    @staticmethod
    def get_client():
        return boto3.client(
            "s3",
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
            region_name="auto"
        )

    @classmethod
    def upload_file(cls, local_path: str, object_name: str, content_type: str = "video/mp4") -> str:
        s3 = cls.get_client()
        extra_args = {"ContentType": content_type}
        s3.upload_file(local_path, settings.R2_BUCKET_NAME, object_name, ExtraArgs=extra_args)
        return cls.get_public_url(object_name)

    @classmethod
    def download_file(cls, object_name: str, local_path: str):
        s3 = cls.get_client()
        s3.download_file(settings.R2_BUCKET_NAME, object_name, local_path)

    @classmethod
    def get_object(cls, object_name: str):
        s3 = cls.get_client()
        return s3.get_object(Bucket=settings.R2_BUCKET_NAME, Key=object_name)

    @classmethod
    def delete_file(cls, object_name: str):
        if not object_name:
            return
        try:
            s3 = cls.get_client()
            s3.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=object_name)
        except Exception as e:
            print(f"[R2StorageService] Notice on deleting {object_name}: {e}")

    @classmethod
    def get_public_url(cls, object_name: str) -> str:
        import urllib.parse
        encoded_name = urllib.parse.quote(object_name, safe="/")
        domain = settings.R2_PUBLIC_DOMAIN.rstrip("/") if settings.R2_PUBLIC_DOMAIN else ""
        if domain:
            if not domain.startswith("http://") and not domain.startswith("https://"):
                domain = f"https://{domain}"
            return f"{domain}/{encoded_name}"
        return f"https://{settings.R2_BUCKET_NAME}.r2.cloudflarestorage.com/{encoded_name}"
