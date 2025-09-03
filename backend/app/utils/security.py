from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends, Header, Request, Response
from sqlalchemy.orm import Session
from ..config import settings
from ..database import get_db
from .. import models

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGO = "HS256"
COOKIE_NAME = "access_token"

def hash_password(p: str) -> str:
    return pwd_ctx.hash(p)

def verify_password(p: str, h: str) -> bool:
    return pwd_ctx.verify(p, h)

def create_access_token(sub: str, expires_minutes: int | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode = {"sub": sub, "exp": expire}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGO)

def set_access_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # под HTTPS → True
        max_age=60 * (settings.ACCESS_TOKEN_EXPIRE_MINUTES or 60*24*30),
    )

def clear_access_cookie(response: Response):
    response.delete_cookie(COOKIE_NAME)

async def _get_bearer(authorization: str | None = Header(default=None)) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    return None

def _extract_token(request: Request, bearer: str | None) -> str:
    if bearer:
        return bearer
    cookie = request.cookies.get(COOKIE_NAME)
    if cookie:
        return cookie
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    bearer: str | None = Depends(_get_bearer),
) -> models.User:
    token = _extract_token(request, bearer)
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGO])
        phone: str | None = payload.get("sub")
        if not phone:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    user = db.query(models.User).filter(models.User.phone == phone).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_admin(user: models.User = Depends(get_current_user)) -> models.User:
    if user.role != models.Role.admin:
        raise HTTPException(status_code=403, detail="Admins only")
    return user
