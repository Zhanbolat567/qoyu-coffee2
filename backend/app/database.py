# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.engine.url import make_url
from .config import settings

if not settings.DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

url = make_url(settings.DATABASE_URL)

# Разрешаем только Postgres (postgresql:// или postgresql+psycopg:// и т.п.)
if url.get_backend_name() != "postgresql":
    raise RuntimeError(
        "DATABASE_URL must be PostgreSQL (starts with 'postgresql://'). "
        f"Got: {url.render_as_string(hide_password=True)}"
    )

# ВНИМАНИЕ: для PostgreSQL нужен драйвер.
# Установи ОДИН из вариантов:
#   pip install psycopg[binary]
# или
#   pip install psycopg2-binary
engine = create_engine(
    url.render_as_string(hide_password=False),
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
