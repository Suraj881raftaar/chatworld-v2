import secrets
from datetime import datetime, timedelta, timezone
import jwt
from jwt.exceptions import InvalidTokenError
from app.core.config import settings
from app.domain.exceptions import TokenExpiredException, TokenInvalidException

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise TokenExpiredException()
    except InvalidTokenError:
        raise TokenInvalidException()

def create_refresh_token() -> str:
    # Generates a cryptographically secure 64-character hex token
    return secrets.token_hex(32)
