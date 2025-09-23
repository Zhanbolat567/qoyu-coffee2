from fastapi import APIRouter, Depends, WebSocket
from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import DashboardStats, HourPoint, RecentOrder
from ..utils.broadcast import hub

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# Удобные выражения "сегодня" и "локальный час" по Asia/Almaty
def _local_date(expr):
    return func.date(func.timezone("Asia/Almaty", expr))

def _local_hour(expr):
    return extract("hour", func.timezone("Asia/Almaty", expr))

@router.get("/stats", response_model=DashboardStats)
def stats(db: Session = Depends(get_db)):
    now = func.now()
    today_local = _local_date(now)

    day_sum = (
        db.query(func.coalesce(func.sum(models.Order.total), 0))
        .filter(_local_date(models.Order.created_at) == today_local)
        .scalar()
        or 0
    )
    month_sum = (
        db.query(func.coalesce(func.sum(models.Order.total), 0))
        .filter(
            extract("year", func.timezone("Asia/Almaty", models.Order.created_at))
            == extract("year", func.timezone("Asia/Almaty", now)),
            extract("month", func.timezone("Asia/Almaty", models.Order.created_at))
            == extract("month", func.timezone("Asia/Almaty", now)),
        )
        .scalar()
        or 0
    )
    day_count = (
        db.query(func.count(models.Order.id))
        .filter(_local_date(models.Order.created_at) == today_local)
        .scalar()
        or 0
    )
    month_count = (
        db.query(func.count(models.Order.id))
        .filter(
            extract("year", func.timezone("Asia/Almaty", models.Order.created_at))
            == extract("year", func.timezone("Asia/Almaty", now)),
            extract("month", func.timezone("Asia/Almaty", models.Order.created_at))
            == extract("month", func.timezone("Asia/Almaty", now)),
        )
        .scalar()
        or 0
    )
    return DashboardStats(
        day_sales=float(day_sum),
        month_sales=float(month_sum),
        day_orders=day_count,
        month_orders=month_count,
    )

@router.get("/hourly-summary", response_model=list[HourPoint])
def hourly(db: Session = Depends(get_db)):
    rows = (
        db.query(_local_hour(models.Order.created_at).label("h"), func.count(models.Order.id))
        .group_by("h")
        .order_by("h")
        .all()
    )
    return [HourPoint(hour=int(h), orders=int(c)) for h, c in rows]

@router.get("/recent-orders", response_model=list[RecentOrder])
def recent(limit: int = 5, db: Session = Depends(get_db)):
    rows = (
        db.query(models.Order)
        .order_by(models.Order.created_at.desc())
        .limit(limit)
        .all()
    )
    # ВАЖНО: отдаём дневной номер guest_seq как id
    return [
        RecentOrder(
            id=o.guest_seq,
            customer_name=o.customer_name,
            total=float(o.total),
            created_at=o.created_at,
        )
        for o in rows
    ]

async def push_dashboard(db: Session):
    await hub.send(
        "dashboard",
        {
            "stats": stats(db),
            "hourly": hourly(db),
            "recent": recent(5, db),
        },
    )

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
