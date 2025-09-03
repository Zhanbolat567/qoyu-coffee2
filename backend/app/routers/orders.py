from fastapi import APIRouter, Depends, HTTPException, WebSocket
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from ..database import get_db
from .. import models
from ..schemas import OrderCreateIn, OrderOut, OrderItemOut, OrdersFeed
from ..utils.security import get_current_user
from ..utils.broadcast import hub
from . import dashboard as dashboard_router

router = APIRouter(prefix="/orders", tags=["orders"])

def _order_to_out(o: models.Order) -> OrderOut:
    items = []
    for it in o.items:
        opts = ", ".join([op.name_snapshot for op in it.options])
        name = it.name_snapshot + (f" ({opts})" if opts else "")
        items.append(OrderItemOut(name=name, quantity=it.qty))
    return OrderOut(
        id=o.id, customer_name=o.customer_name, take_away=o.take_away,
        items=items, total=float(o.total), created_at=o.created_at
    )

async def _broadcast_refresh(db: Session):
    act = db.query(models.Order).filter(models.Order.status == models.OrderStatus.active).order_by(models.Order.created_at.asc()).all()
    cls = db.query(models.Order).filter(models.Order.status == models.OrderStatus.closed).order_by(models.Order.closed_at.desc()).limit(10).all()
    payload = {
        "type": "orders",
        "active": [_order_to_out(x).model_dump() for x in act],
        "recent_closed": [_order_to_out(x).model_dump() for x in cls],
    }
    await hub.send("orders", payload)
    await dashboard_router.push_dashboard(db)

@router.post("", response_model=OrderOut, status_code=201)
async def create_order(body: OrderCreateIn, db: Session = Depends(get_db), _user = Depends(get_current_user)):
    if not body.items:
        raise HTTPException(400, detail="Empty cart")
    order = models.Order(customer_name=body.customer_name.strip() or "Гость", take_away=body.take_away, total=0)
    db.add(order); db.flush()

    total = 0.0
    for it in body.items:
        prod = db.query(models.Product).get(it.product_id)
        if not prod:
            raise HTTPException(400, detail=f"Product {it.product_id} not found")

        # Базовая цена: берём присланную базу со скидкой (если есть), иначе base_price товара
        unit = float(it.unit_price_base) if it.unit_price_base is not None else float(prod.base_price)

        # В снепшот названия добавляем метку скидки (например, " [-20%]"), если прислана
        name_snap = prod.name + (it.name_suffix or "")

        item = models.OrderItem(order=order, product=prod, name_snapshot=name_snap, unit_price=unit, qty=it.qty)
        db.add(item); db.flush()

        # Прибавляем опции к цене единицы
        if it.option_item_ids:
            opts = db.query(models.OptionItem).filter(models.OptionItem.id.in_(it.option_item_ids)).all()
            for op in opts:
                db.add(models.OrderItemOption(item=item, option_item=op, name_snapshot=op.name, price=op.price))
                unit += float(op.price)

        total += unit * it.qty
        item.unit_price = unit

    order.total = total
    db.commit(); db.refresh(order)
    await _broadcast_refresh(db)
    return _order_to_out(order)

@router.get("", response_model=List[OrderOut])
async def list_orders(status: models.OrderStatus = models.OrderStatus.active, limit: int = 50, db: Session = Depends(get_db), _user = Depends(get_current_user)):
    q = db.query(models.Order).filter(models.Order.status == status)
    if status == models.OrderStatus.active:
        q = q.order_by(models.Order.created_at.asc())
    else:
        q = q.order_by(models.Order.closed_at.desc())
    rows = q.limit(limit).all()
    return [_order_to_out(x) for x in rows]

@router.patch("/{oid}/close", response_model=OrderOut)
async def close_order(oid: int, db: Session = Depends(get_db), _user = Depends(get_current_user)):
    o = db.query(models.Order).get(oid)
    if not o:
        raise HTTPException(404, detail="Not found")
    if o.status == models.OrderStatus.closed:
        return _order_to_out(o)
    o.status = models.OrderStatus.closed
    o.closed_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(o)
    await _broadcast_refresh(db)
    return _order_to_out(o)

@router.delete("/closed")
async def clear_closed(db: Session = Depends(get_db), _user = Depends(get_current_user)):
    db.query(models.OrderItemOption).delete(synchronize_session=False)
    db.query(models.OrderItem).delete(synchronize_session=False)
    db.query(models.Order).filter(models.Order.status == models.OrderStatus.closed).delete(synchronize_session=False)
    db.commit()
    await _broadcast_refresh(db)
    return {"ok": True}

@router.get("/feed", response_model=OrdersFeed)
async def feed(recent: int = 10, db: Session = Depends(get_db)):
    act = db.query(models.Order).filter(models.Order.status == models.OrderStatus.active).order_by(models.Order.created_at.asc()).all()
    cls = db.query(models.Order).filter(models.Order.status == models.OrderStatus.closed).order_by(models.Order.closed_at.desc()).limit(recent).all()
    return OrdersFeed(active=[_order_to_out(x) for x in act], recent_closed=[_order_to_out(x) for x in cls])

@router.websocket("/ws")
async def ws(ws: WebSocket):
    await hub.join("orders", ws)
    try:
        while True:
            await ws.receive_text()
    except Exception:
        pass
    finally:
        hub.leave("orders", ws)
