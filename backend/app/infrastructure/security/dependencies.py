from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.infrastructure.database.session import get_db
from app.infrastructure.database.repository import SqlAlchemyUserRepository
from app.infrastructure.security.jwt import decode_access_token
from app.domain.entities.user import User
from app.domain.exceptions import TokenInvalidException, TokenExpiredException, UserSuspendedException

security_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise TokenInvalidException("Token missing subject claim")
        
        user_id = UUID(user_id_str)
    except (TokenInvalidException, TokenExpiredException) as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token subject formatting")

    user_repo = SqlAlchemyUserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is suspended")
        
    return user


async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access forbidden: system administrator privileges required"
        )
    return current_user
