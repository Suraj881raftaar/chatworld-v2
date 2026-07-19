# Monkeypatch bcrypt for passlib compatibility (prevents AttributeError: module 'bcrypt' has no attribute '__about__')
import bcrypt
if not hasattr(bcrypt, "__about__"):
    class About:
        __version__ = bcrypt.__version__
    bcrypt.__about__ = About()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.infrastructure.web.middleware.errors import register_error_handlers

# Initialize structured logging
setup_logging()

from contextlib import asynccontextmanager
import asyncio
from app.services.chat import manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Safe database schemas initialization
    from app.infrastructure.database.session import engine
    from app.infrastructure.database.models import Base
    from loguru import logger
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database schemas checked/created successfully (metadata create_all).")
    except Exception as e:
        logger.error(f"Error initializing database metadata on startup: {e}")

    # Startup actions: connect to Redis Pub/Sub
    await manager.initialize()
    yield
    # Shutdown actions: cancel listener tasks
    if manager.listener_task:
        manager.listener_task.cancel()
        try:
            await manager.listener_task
        except asyncio.CancelledError:
            pass
    if manager.redis_client:
        await manager.redis_client.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="A modern real-time chat application built with Clean Architecture.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

from fastapi.staticfiles import StaticFiles
import os
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Centralized error mapping
register_error_handlers(app)

from app.infrastructure.web.routers.auth import router as auth_router
from app.infrastructure.web.routers.users import router as users_router
from app.infrastructure.web.routers.rooms import router as rooms_router
from app.infrastructure.web.routers.ws import router as ws_router
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(rooms_router, prefix="/api/v1")
app.include_router(ws_router, prefix="/api/v1")

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }

from fastapi.responses import FileResponse
@app.get("/{catchall:path}")
async def serve_spa(catchall: str):
    static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "static"))
    file_path = os.path.join(static_dir, catchall)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(static_dir, "index.html"))
