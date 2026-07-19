from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.engine import Engine
from sqlalchemy import event
from app.core.config import settings
from loguru import logger

# Enforce foreign key constraints on SQLite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in settings.DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
        logger.debug("Enforced SQLite Foreign Key Constraints (PRAGMA foreign_keys=ON)")

# Set engine pool properties based on database dialect
engine_options = {}
if "sqlite" in settings.DATABASE_URL:
    engine_options["connect_args"] = {"check_same_thread": False}
else:
    engine_options.update({
        "pool_size": 20,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 1800
    })

engine = create_async_engine(settings.DATABASE_URL, **engine_options)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
            logger.debug("Database session closed cleanly.")
