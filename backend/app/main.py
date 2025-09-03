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
origins = settings.cors_origins_list or ["http://localhost:5173"]
allow_credentials = origins != ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ---- /media ----
os.makedirs(settings.media_dir, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")

# ---- routers ----
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
