from fastapi import APIRouter, Depends, HTTPException, WebSocket, Form, UploadFile, File, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models
from ..schemas import OptionGroupOut, OptionItemOut
from ..utils.security import require_admin
from ..utils.broadcast import hub
from ..utils.files import save_image, remove_image
from ..config import settings

router = APIRouter(prefix="/options", tags=["options"])

def _image_url_abs(request: Request, filename: Optional[str]) -> Optional[str]:
    if not filename:
        return None
    return str(request.url_for("media", path=filename))

def _image_url_from_env(filename: Optional[str]) -> Optional[str]:
    if not filename:
        return None
    if settings.PUBLIC_MEDIA_URL:
        return f"{settings.PUBLIC_MEDIA_URL.rstrip('/')}/{filename}"
    return f"/media/{filename}"

def _item_dict_http(request: Request, it: models.OptionItem) -> dict:
    fname = getattr(it, "image_filename", None) or getattr(it, "image_path", None)
    return {
        "id": it.id,
        "name": it.name,
        "price": float(it.price),
        "image_url": _image_url_abs(request, fname),
    }

def _item_dict_ws(it: models.OptionItem) -> dict:
    fname = getattr(it, "image_filename", None) or getattr(it, "image_path", None)
    return {
        "id": it.id,
        "name": it.name,
        "price": float(it.price),
        "image_url": _image_url_from_env(fname),
    }

def _group_dict_http(request: Request, g: models.OptionGroup) -> dict:
    return {
        "id": g.id,
        "name": g.name,
        "select_type": g.select_type,
        "is_required": g.is_required,
        "items": [_item_dict_http(request, it) for it in g.items],
    }

def _group_dict_ws(g: models.OptionGroup) -> dict:
    return {
        "id": g.id,
        "name": g.name,
        "select_type": g.select_type,
        "is_required": g.is_required,
        "items": [_item_dict_ws(it) for it in g.items],
    }

async def _broadcast(db: Session):
    groups = db.query(models.OptionGroup).all()
    await hub.send("options", {"type": "options", "groups": [_group_dict_ws(g) for g in groups]})

@router.get("/groups", response_model=List[OptionGroupOut])
def list_groups(request: Request, db: Session = Depends(get_db)):
    groups = db.query(models.OptionGroup).all()
    return [_group_dict_http(request, g) for g in groups]

@router.post("/groups", response_model=OptionGroupOut)
async def create_group(
    request: Request,
    name: str = Form(...),
    select_type: models.SelectType = Form(models.SelectType.single),
    is_required: bool = Form(False),
    db: Session = Depends(get_db),
    _ = Depends(require_admin),
):
    if db.query(models.OptionGroup).filter(models.OptionGroup.name == name).first():
        raise HTTPException(400, detail="Group exists")
    g = models.OptionGroup(name=name, select_type=select_type, is_required=is_required)
    db.add(g); db.commit(); db.refresh(g)
    await _broadcast(db)
    return _group_dict_http(request, g)

@router.put("/groups/{gid}", response_model=OptionGroupOut)
async def update_group(
    gid: int,
    request: Request,
    name: str = Form(...),
    select_type: models.SelectType = Form(...),
    is_required: bool = Form(...),
    db: Session = Depends(get_db),
    _ = Depends(require_admin),
):
    g = db.query(models.OptionGroup).get(gid)
    if not g:
        raise HTTPException(404, detail="Not found")
    g.name, g.select_type, g.is_required = name, select_type, is_required
    db.commit(); db.refresh(g)
    await _broadcast(db)
    return _group_dict_http(request, g)

@router.delete("/groups/{gid}")
async def delete_group(gid: int, db: Session = Depends(get_db), _ = Depends(require_admin)):
    g = db.query(models.OptionGroup).get(gid)
    if not g:
        raise HTTPException(404, detail="Not found")
    for it in g.items:
        old = getattr(it, "image_filename", None) or getattr(it, "image_path", None)
        if old:
            remove_image(old)
    db.delete(g); db.commit()
    await _broadcast(db)
    return {"ok": True}

@router.post("/groups/{gid}/items", response_model=OptionItemOut)
async def add_item(
    gid: int,
    request: Request,
    name: str = Form(...),
    price: float = Form(0),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    _ = Depends(require_admin),
):
    g = db.query(models.OptionGroup).get(gid)
    if not g:
        raise HTTPException(404, detail="Group not found")
    fname = save_image(image) if image else None
    it = models.OptionItem(group=g, name=name, price=price)
    if hasattr(it, "image_filename"):
        it.image_filename = fname
    elif hasattr(it, "image_path"):
        it.image_path = fname
    db.add(it); db.commit(); db.refresh(it)
    await _broadcast(db)
    return _item_dict_http(request, it)

@router.put("/items/{iid}", response_model=OptionItemOut)
async def edit_item(
    iid: int,
    request: Request,
    name: str = Form(...),
    price: float = Form(...),
    image: UploadFile | None = File(None),
    image_clear: bool = Form(False),
    db: Session = Depends(get_db),
    _ = Depends(require_admin),
):
    it = db.query(models.OptionItem).get(iid)
    if not it:
        raise HTTPException(404, detail="Not found")

    it.name, it.price = name, price

    current = getattr(it, "image_filename", None) or getattr(it, "image_path", None)
    if image:
        newf = save_image(image)
        if hasattr(it, "image_filename"):
            it.image_filename = newf
        elif hasattr(it, "image_path"):
            it.image_path = newf
        if current:
            remove_image(current)
    elif image_clear and current:
        if hasattr(it, "image_filename"):
            it.image_filename = None
        elif hasattr(it, "image_path"):
            it.image_path = None
        remove_image(current)

    db.commit(); db.refresh(it)
    await _broadcast(db)
    return _item_dict_http(request, it)

@router.delete("/items/{iid}")
async def remove_item(iid: int, db: Session = Depends(get_db), _ = Depends(require_admin)):
    it = db.query(models.OptionItem).get(iid)
    if not it:
        raise HTTPException(404, detail="Not found")
    current = getattr(it, "image_filename", None) or getattr(it, "image_path", None)
    if current:
        remove_image(current)
    db.delete(it); db.commit()
    await _broadcast(db)
    return {"ok": True}

@router.websocket("/ws")
async def ws(ws: WebSocket, db: Session = Depends(get_db)):
    await hub.join("options", ws)
    # отдадим актуальные данные сразу (через PUBLIC_MEDIA_URL)
    groups = db.query(models.OptionGroup).all()
    await ws.send_json({"type": "options", "groups": [_group_dict_ws(g) for g in groups]})
    try:
        while True:
            await ws.receive_text()
    except Exception:
        pass
    finally:
        hub.leave("options", ws)
