from fastapi import APIRouter, Depends, WebSocket
from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import DashboardStats, HourPoint, RecentOrder
from ..utils.broadcast import hub

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats", response_model=DashboardStats)
def stats(db: Session = Depends(get_db)):
    now = func.now()
    day_sum = db.query(func.coalesce(func.sum(models.Order.total), 0)).filter(func.date(models.Order.created_at) == func.date(now)).scalar() or 0
    month_sum = db.query(func.coalesce(func.sum(models.Order.total), 0)).filter(
        extract('year', models.Order.created_at) == extract('year', now),
        extract('month', models.Order.created_at) == extract('month', now)
    ).scalar() or 0
    day_count = db.query(func.count(models.Order.id)).filter(func.date(models.Order.created_at) == func.date(now)).scalar() or 0
    month_count = db.query(func.count(models.Order.id)).filter(
        extract('year', models.Order.created_at) == extract('year', now),
        extract('month', models.Order.created_at) == extract('month', now)
    ).scalar() or 0
    return DashboardStats(day_sales=float(day_sum), month_sales=float(month_sum), day_orders=day_count, month_orders=month_count)

@router.get("/hourly-summary", response_model=list[HourPoint])
def hourly(db: Session = Depends(get_db)):
    rows = db.query(extract('hour', models.Order.created_at).label('h'), func.count(models.Order.id)).group_by('h').order_by('h').all()
    return [HourPoint(hour=int(h), orders=int(c)) for h, c in rows]

@router.get("/recent-orders", response_model=list[RecentOrder])
def recent(limit: int = 5, db: Session = Depends(get_db)):
    q = db.query(models.Order).order_by(models.Order.created_at.desc()).limit(limit).all()
    return q

async def push_dashboard(db: Session):
    await hub.send("dashboard", {
        "stats": stats(db),
        "hourly": hourly(db),
        "recent": recent(5, db),
    })

@router.websocket("/ws")
async def ws(ws: WebSocket):
    await hub.join("dashboard", ws)
    try:
        while True:
            await ws.receive_text()
    except Exception:
        pass
    finally:
        hub.leave("dashboard", ws)
