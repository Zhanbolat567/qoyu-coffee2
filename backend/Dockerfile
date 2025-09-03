FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# зависимости системы (по желанию tzdata/curl)
RUN apt-get update && apt-get install -y --no-install-recommends tzdata curl && rm -rf /var/lib/apt/lists/*

# зависимости python
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# код и медиа
COPY app ./app
COPY media ./media

# по умолчанию читаем .env, где MEDIA_DIR=media
EXPOSE 8000
CMD ["bash", "-lc", "python -m app.create_db && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
