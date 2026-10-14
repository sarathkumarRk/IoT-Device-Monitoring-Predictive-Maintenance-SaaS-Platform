import cloudinary
import cloudinary.uploader

from app.config import settings


cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


def upload_device_document(file):
    try:
        result = cloudinary.uploader.upload(
            file,
            resource_type="raw",
            folder="iot-device-documents",
        )

        return {
            "success": True,
            "url": result.get("secure_url"),
            "public_id": result.get("public_id"),
        }

    except Exception:
        return {
            "success": False,
            "url": None,
            "public_id": None,
        }