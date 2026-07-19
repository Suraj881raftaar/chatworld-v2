import sys
import logging
from loguru import logger
from app.core.config import settings

def setup_logging() -> None:
    # Remove default handlers
    logger.remove()

    # Determine logging style based on environment
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    )

    if settings.ENVIRONMENT == "production":
        # In production, output structured JSON for log processors
        logger.add(
            sys.stdout,
            format="{extra} {message}",
            serialize=True,
            level="INFO"
        )
    else:
        # In development, use clean colorized terminal outputs
        logger.add(
            sys.stdout,
            format=log_format,
            colorize=True,
            level="DEBUG"
        )

    # Intercept standard library logging calls
    class InterceptHandler(logging.Handler):
        def emit(self, record):
            try:
                level = logger.level(record.levelname).name
            except ValueError:
                level = record.levelno

            frame = logging.currentframe()
            depth = 2
            while frame.f_code.co_filename == logging.__file__:
                frame = frame.f_back
                depth += 1

            logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())

    # Apply interception to standard libraries (uvicorn, fastapi)
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"):
        logging_logger = logging.getLogger(name)
        logging_logger.handlers = [InterceptHandler()]
        logging_logger.propagate = False
