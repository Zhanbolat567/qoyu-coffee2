from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request, WebSocket
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from ..database import get_db
from .. import models
from ..schemas import ProductOut
from ..utils.security import require_admin
from ..utils.broadcast import hub
from ..utils.files import save_image, remove_image
from ..config import settings

router = APIRouter(prefix="/products", tags=["products"])

def _media_url_abs(request: Request, filename: Optional[str]) -> Optional[str]:
    if not filename:
        return None
    # строим абсолютный URL через смонтированный endpoint "media"
    return str(request.url_for("media", path=filename))

def _media_url_from_env(filename: Optional[str]) -> Optional[str]:
    if not filename:
        return None
    if settings.PUBLIC_MEDIA_URL:
        return f"{settings.PUBLIC_MEDIA_URL.rstrip('/')}/{filename}"
    # запасной вариант (относительный) – если переменная не задана
    return f"/media/{filename}"

def _product_out(request: Request, p: models.Product) -> ProductOut:
    fname = getattr(p, "image_filename", None) or getattr(p, "image_path", None)
    return ProductOut(
        id=p.id,
        name=p.name,
        base_price=float(p.base_price),
        description=p.description,
        category_name=p.category.name if p.category else None,
        image_url=_media_url_abs(request, fname),
        option_group_ids=[g.id for g in p.option_groups],
    )

def _by_category_http(request: Request, db: Session) -> Dict[str, List[dict]]:
    rows = db.query(models.Product).outerjoin(models.Category).all()
    out: Dict[str, List[dict]] = {}
    for p in rows:
        cat = p.category.name if p.category else "Без категории"
        fname = getattr(p, "image_filename", None) or getattr(p, "image_path", None)
        out.setdefault(cat, []).append({
            "id": p.id,
            "name": p.name,
            "price": float(p.base_price),
            "image_url": _media_url_abs(request, fname),
        })
    return out

def _by_category_ws(db: Session) -> Dict[str, List[dict]]:
    # для WebSocket используем PUBLIC_MEDIA_URL
    rows = db.query(models.Product).outerjoin(models.Category).all()
    out: Dict[str, List[dict]] = {}
    for p in rows:
        cat = p.category.name if p.category else "Без категории"
        fname = getattr(p, "image_filename", None) or getattr(p, "image_path", None)
        out.setdefault(cat, []).append({
            "id": p.id,
            "name": p.name,
            "price": float(p.base_price),
            "image_url": _media_url_from_env(fname),
        })
    return out

async def _push_products(db: Session):
    await hub.send("products", {"by_category": _by_category_ws(db)})

@router.get("")
def list_grouped(request: Request, db: Session = Depends(get_db)):
    # В HTTP-ответе – абсолютные URLs
    return _by_category_http(request, db)

@router.get("/{pid}", response_model=ProductOut)
def get_one(pid: int, request: Request, db: Session = Depends(get_db)):
    p = db.query(models.Product).get(pid)
    if not p:
        raise HTTPException(404, detail="Not found")
    return _product_out(request, p)

@router.post("", response_model=ProductOut)
async def create(
    request: Request,
    name: str = Form(...),
    base_price: float = Form(...),
    category_name: str = Form(...),
    description: Optional[str] = Form(None),
    option_group_ids: Optional[str] = Form(None),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    _admin = Depends(require_admin),
):
    cat = db.query(models.Category).filter(models.Category.name == category_name).first()
    if not cat:
        cat = models.Category(name=category_name)
        db.add(cat); db.flush()

    filename = save_image(image) if image else None

    p = models.Product(name=name, base_price=base_price, description=description, category=cat)
    if hasattr(p, "image_filename"):
        p.image_filename = filename
    elif hasattr(p, "image_path"):
        p.image_path = filename

    if option_group_ids:
        ids = [int(x) for x in option_group_ids.split(",") if x]
        groups = db.query(models.OptionGroup).filter(models.OptionGroup.id.in_(ids)).all()
        p.option_groups = groups

    db.add(p); db.commit(); db.refresh(p)
    await _push_products(db)
    return _product_out(request, p)

@router.put("/{pid}", response_model=ProductOut)
async def update(
    pid: int,
    request: Request,
    name: str = Form(...),
    base_price: float = Form(...),
    category_name: str = Form(...),
    description: Optional[str] = Form(None),
    option_group_ids: Optional[str] = Form(None),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    _admin = Depends(require_admin),
):
    p = db.query(models.Product).get(pid)
    if not p:
        raise HTTPException(404, detail="Not found")

    cat = db.query(models.Category).filter(models.Category.name == category_name).first()
    if not cat:
        cat = models.Category(name=category_name)
        db.add(cat); db.flush()

    p.name = name
    p.base_price = base_price
    p.description = description
    p.category = cat

    prev = getattr(p, "image_filename", None) or getattr(p, "image_path", None)
    if image:
        new_name = save_image(image)
        if hasattr(p, "image_filename"):
            p.image_filename = new_name
        elif hasattr(p, "image_path"):
            p.image_path = new_name
        if prev:
            remove_image(prev)

    if option_group_ids is not None:
        ids = [int(x) for x in option_group_ids.split(",") if x]
        groups = db.query(models.OptionGroup).filter(models.OptionGroup.id.in_(ids)).all()
        p.option_groups = groups

    db.commit(); db.refresh(p)
    await _push_products(db)
    return _product_out(request, p)

@router.delete("/{pid}")
async def delete(pid: int, db: Session = Depends(get_db), _admin = Depends(require_admin)):
    p = db.query(models.Product).get(pid)
    if not p:
        raise HTTPException(404, detail="Not found")
    prev = getattr(p, "image_filename", None) or getattr(p, "image_path", None)
    if prev:
        remove_image(prev)
    db.delete(p); db.commit()
    await _push_products(db)
    return {"ok": True}

@router.websocket("/ws")
async def ws(ws: WebSocket, db: Session = Depends(get_db)):
    await hub.join("products", ws)
    # сразу отдадим последнее состояние (через PUBLIC_MEDIA_URL)
    await ws.send_json({"by_category": _by_category_ws(db)})
    try:
        while True:
            await ws.receive_text()
    except Exception:
        pass
    finally:
        hub.leave("products", ws)
