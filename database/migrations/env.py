import sys
from logging.config import fileConfig
from os.path import abspath, dirname, join

# Add backend directory to path to allow importing app configs
sys.path.insert(0, abspath(join(dirname(dirname(dirname(__file__))), "backend")))

from sqlalchemy import engine_from_config, pool
from alembic import context

from app.core.config import settings
from app.infrastructure.database.models import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Dynamic database URL extraction from application settings
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite+aiosqlite://"):
    db_url = db_url.replace("sqlite+aiosqlite://", "sqlite://")
elif db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

config.set_main_option("sqlalchemy.url", db_url)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Ensure SQLite batch mode is rendered for compatibility
    is_sqlite = "sqlite" in db_url

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            render_as_batch=is_sqlite
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
