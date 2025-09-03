from __future__ import annotations
from pathlib import Path
import secrets, shutil, mimetypes
from typing import Optional
from fastapi import UploadFile
from app.config import settings  # важно: app.config + media_dir + public_media_url

MEDIA_ROOT = Path(settings.media_dir).resolve()
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

_ALLOWED = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

def _choose_ext(file: UploadFile) -> str:
    ext = Path(file.filename or "").suffix.lower()
    if ext in _ALLOWED:
        return ext
    guessed = mimetypes.guess_extension((file.content_type or "").split(";")[0].strip())
    if guessed in _ALLOWED:
        return guessed
    return ".jpg"

def save_image(file: UploadFile) -> str:
    if not file:
        return ""
    ext = _choose_ext(file)
    name = f"{secrets.token_hex(16)}{ext}"
    dest = MEDIA_ROOT / name
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return name  # в БД храним только имя

def remove_image(filename: Optional[str]) -> None:
    if not filename:
        return
    try:
        (MEDIA_ROOT / filename).unlink(missing_ok=True)
    except Exception:
        pass

def media_url(filename: Optional[str]) -> Optional[str]:
    if not filename:
        return None
    return f"{str(settings.public_media_url).rstrip('/')}/{filename.lstrip('/')}"
