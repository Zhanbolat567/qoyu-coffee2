# app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine
from .routers import auth, categories, products, options, dashboard, orders

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    docs_url="/docs",
    redoc_url="/redoc",
)

Base.metadata.create_all(bind=engine)

origins = settings.cors_origins_list  # <— из .env / config
allow_credentials = bool(origins) and origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or [],     # same-origin через Caddy CORS не требует
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.media_dir, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(options.router)
app.include_router(dashboard.router)
app.include_router(orders.router)

@app.get("/health")
def health():
    return {"ok": True, "app": settings.app_name}

@app.get("/")
def root():
    return {"message": f"{settings.app_name}. See /docs for API."}
