from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..utils.security import (
    hash_password, verify_password, create_access_token,
    set_access_cookie, clear_access_cookie, get_current_user
)
from ..schemas import Token, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

async def _take_payload(request: Request):
    ct = (request.headers.get("content-type") or "").lower()
    if "application/json" in ct:
        data = await request.json()
    else:
        form = await request.form()
        data = dict(form)
    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or data.get("phone_number") or "").strip()
    password = data.get("password") or ""
    return name, phone, password

@router.post("/register", response_model=UserOut)
async def register(request: Request, response: Response, db: Session = Depends(get_db)):
    name, phone, password = await _take_payload(request)
    if not name or not phone or not password:
        raise HTTPException(400, detail="name, phone (или phone_number), password — обязательны")
    if db.query(models.User).filter(models.User.phone == phone).first():
        raise HTTPException(400, detail="Phone already registered")

    is_first = db.query(models.User).first() is None
    user = models.User(
        name=name, phone=phone,
        password_hash=hash_password(password),
        role=models.Role.admin if is_first else models.Role.admin
    )
    db.add(user); db.commit(); db.refresh(user)

    token = create_access_token(sub=user.phone)
    set_access_cookie(response, token)
    return user

@router.post("/login", response_model=Token)
async def login_json(request: Request, response: Response, db: Session = Depends(get_db)):
    _, phone, password = await _take_payload(request)
    user = db.query(models.User).filter(models.User.phone == phone).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(sub=user.phone)
    set_access_cookie(response, token)
    return Token(access_token=token)

@router.post("/token", response_model=Token)  # фолбэк OAuth2 form
def login_form(response: Response, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.phone == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(sub=user.phone)
    set_access_cookie(response, token)
    return Token(access_token=token)

@router.get("/me", response_model=UserOut)
def me(user: models.User = Depends(get_current_user)):
    return user

@router.post("/logout")
def logout(response: Response):
    clear_access_cookie(response)
    return {"ok": True}
