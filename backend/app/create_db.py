# app/create_db.py
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from .config import settings
from .database import Base  # Берём Declarative Base
from . import models  # Регистрируем все модели (обязательно, чтобы create_all увидел таблицы)


def _create_database_if_missing(url):
    """
    Подключаемся к системной БД (postgres или template1), проверяем наличие,
    при отсутствии — создаём целевую БД.
    """
    dbname = url.database
    if not dbname:
        raise RuntimeError("DATABASE_URL must include a database name")

    # сначала пытаемся через 'postgres'
    candidates = ["postgres", "template1"]
    last_err = None

    for sys_db in candidates:
        try:
            admin_url = url.set(database=sys_db)
            admin_engine = create_engine(
                admin_url.render_as_string(hide_password=False),
                isolation_level="AUTOCOMMIT",
                pool_pre_ping=True,
            )
            with admin_engine.connect() as conn:
                exists = conn.execute(
                    text("SELECT 1 FROM pg_database WHERE datname = :n"),
                    {"n": dbname},
                ).scalar()
                if not exists:
                    # Экранируем кавычки в имени БД
                    safe_dbname = dbname.replace('"', '""')
                    conn.execute(text(f'CREATE DATABASE "{safe_dbname}"'))
                    print(f"✓ Database '{dbname}' created using '{sys_db}'")
                else:
                    print(f"• Database '{dbname}' already exists")
                return  # успех — выходим
        except Exception as e:
            last_err = e
            continue

    # если все кандидаты не сработали — кидаем последнюю ошибку
    if last_err:
        raise last_err


def main():
    url = make_url(settings.DATABASE_URL)

    # 1) Создаём БД (если ещё нет)
    _create_database_if_missing(url)

    # 2) Создаём таблицы в целевой БД
    target_engine = create_engine(
        url.render_as_string(hide_password=False),
        pool_pre_ping=True,
    )
    Base.metadata.create_all(bind=target_engine)
    print(f"✓ Tables created in '{url.database}'")


if __name__ == "__main__":
    main()
