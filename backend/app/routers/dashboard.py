from fastapi import APIRouter, Depends, WebSocket
from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import DashboardStats, HourPoint, RecentOrder
from ..utils.broadcast import hub

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

KZ_TZ = "Asia/Almaty"


@router.get("/stats", response_model=DashboardStats)
def stats(db: Session = Depends(get_db)):
    now = func.now()
    local_day = func.date(func.timezone(KZ_TZ, now))
    local_year = extract('year', func.timezone(KZ_TZ, now))
    local_month = extract('month', func.timezone(KZ_TZ, now))

    day_sum = db.query(func.coalesce(func.sum(models.Order.total), 0)).filter(
        func.date(func.timezone(KZ_TZ, models.Order.created_at)) == local_day
    ).scalar() or 0

    month_sum = db.query(func.coalesce(func.sum(models.Order.total), 0)).filter(
        extract('year', func.timezone(KZ_TZ, models.Order.created_at)) == local_year,
        extract('month', func.timezone(KZ_TZ, models.Order.created_at)) == local_month
    ).scalar() or 0

    day_count = db.query(func.count(models.Order.id)).filter(
        func.date(func.timezone(KZ_TZ, models.Order.created_at)) == local_day
    ).scalar() or 0

    month_count = db.query(func.count(models.Order.id)).filter(
        extract('year', func.timezone(KZ_TZ, models.Order.created_at)) == local_year,
        extract('month', func.timezone(KZ_TZ, models.Order.created_at)) == local_month
    ).scalar() or 0

    return DashboardStats(
        day_sales=float(day_sum),
        month_sales=float(month_sum),
        day_orders=day_count,
        month_orders=month_count
    )


@router.get("/hourly-summary", response_model=list[HourPoint])
def hourly(db: Session = Depends(get_db)):
    rows = db.query(
        extract('hour', func.timezone(KZ_TZ, models.Order.created_at)).label('h'),
        func.count(models.Order.id)
    ).group_by('h').order_by('h').all()
    return [HourPoint(hour=int(h), orders=int(c)) for h, c in rows]


@router.get("/recent-orders", response_model=list[RecentOrder])
def recent(limit: int = 5, db: Session = Depends(get_db)):
    rows = (
        db.query(models.Order)
        .order_by(models.Order.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        RecentOrder(
            id=o.guest_seq,  # показываем дневной номер
            customer_name=o.customer_name,
            total=float(o.total),
            created_at=o.created_at,
        )
        for o in rows
    ]


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
