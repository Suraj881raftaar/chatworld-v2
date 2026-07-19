import os
import shutil
import uuid
from fastapi import UploadFile
from app.domain.exceptions import DomainException

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB limit
ALLOWED_EXTENSIONS = {
    # Images
    "png", "jpg", "jpeg", "gif", "webp",
    # Documents
    "pdf", "doc", "docx", "xls", "xlsx", "txt",
    # Audio/Video
    "mp3", "wav", "mp4", "m4a"
}

class LocalStorageService:
    def __init__(self, upload_dir: str = "static/uploads"):
        self.upload_dir = upload_dir
        # Ensure upload directory exists
        os.makedirs(self.upload_dir, exist_ok=True)

    async def upload_file(self, file: UploadFile) -> str:
        # Check file extension
        filename = file.filename or ""
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise DomainException(
                message=f"File extension '.{ext}' is not supported",
                error_code="INVALID_FILE_TYPE",
                status_code=400
            )

        # Generate unique filename to prevent namespace collisions
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(self.upload_dir, unique_filename)

        # Write file in chunks and validate total size
        total_size = 0
        try:
            with open(filepath, "wb") as buffer:
                while True:
                    chunk = await file.read(1024 * 64)  # Read in 64kb chunks
                    if not chunk:
                        break
                    total_size += len(chunk)
                    if total_size > MAX_FILE_SIZE:
                        # Clean up partial file on limits breach
                        buffer.close()
                        os.remove(filepath)
                        raise DomainException(
                            message="File size exceeds the maximum limit of 10MB",
                            error_code="FILE_TOO_LARGE",
                            status_code=400
                        )
                    buffer.write(chunk)
        finally:
            await file.close()

        # Return relative access URL
        return f"/static/uploads/{unique_filename}"
