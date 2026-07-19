from datetime import datetime, timezone
from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.domain.exceptions import DomainException
from loguru import logger

def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainException)
    async def domain_exception_handler(request: Request, exc: DomainException):
        logger.warning(
            f"Domain Exception mapping: path={request.url.path} "
            f"error_code={exc.error_code} detail={exc.message}"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status_code": exc.status_code,
                "error_code": exc.error_code,
                "detail": exc.message,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(f"Validation failure: path={request.url.path} errors={exc.errors()}")
        return JSONResponse(
            status_code=400,
            content={
                "status_code": 400,
                "error_code": "VALIDATION_ERROR",
                "detail": "Input validation failed",
                "errors": exc.errors(),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled system exception: path={request.url.path}")
        return JSONResponse(
            status_code=500,
            content={
                "status_code": 500,
                "error_code": "INTERNAL_SERVER_ERROR",
                "detail": "An unexpected system error occurred.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
