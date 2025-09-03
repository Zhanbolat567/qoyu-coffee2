from pathlib import Path
from fastapi import UploadFile
from ..config import settings
import secrets
from app.utils.files import save_image, remove_image, media_url
MEDIA_ROOT = Path(settings.MEDIA_DIR)
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

def save_image(file: UploadFile) -> str:
    if not file:
        return ""
    ext = (file.filename or "").split(".")[-1].lower() or "jpg"
    name = f"{secrets.token_hex(8)}.{ext}"
    dest = MEDIA_ROOT / name
    with dest.open("wb") as f:
        f.write(file.file.read())
    return name
