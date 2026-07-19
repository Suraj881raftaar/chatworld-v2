from fastapi import APIRouter, Depends, Response, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.database.session import get_db
from app.infrastructure.database.repository import SqlAlchemyUserRepository
from app.infrastructure.database.token_repository import SqlAlchemyTokenRepository
from app.application.use_cases.auth import (
    RegisterUserUseCase,
    LoginUserUseCase,
    RefreshTokenUseCase,
    LogoutUserUseCase
)
from app.schemas.auth import UserRegister, UserLogin, UserOut, TokenOut
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=UserOut, status_code=201)
async def signup(schema: UserRegister, db: AsyncSession = Depends(get_db)):
    user_repo = SqlAlchemyUserRepository(db)
    use_case = RegisterUserUseCase(user_repo)
    user = await use_case.execute(schema)
    return user


@router.post("/login", response_model=TokenOut)
async def login(schema: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    user_repo = SqlAlchemyUserRepository(db)
    token_repo = SqlAlchemyTokenRepository(db)
    use_case = LoginUserUseCase(user_repo, token_repo)
    
    access_token, refresh_token, user = await use_case.execute(schema)
    
    # Set HttpOnly refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True if settings.ENVIRONMENT == "production" else False,
        samesite="strict",
        path="/api/v1/auth",
        max_age=7 * 24 * 60 * 60 # 7 days in seconds
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/refresh")
async def refresh(request: Request, db: AsyncSession = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing from cookies")

    user_repo = SqlAlchemyUserRepository(db)
    token_repo = SqlAlchemyTokenRepository(db)
    use_case = RefreshTokenUseCase(user_repo, token_repo)
    
    new_access_token = await use_case.execute(refresh_token)
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }


@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        token_repo = SqlAlchemyTokenRepository(db)
        use_case = LogoutUserUseCase(token_repo)
        await use_case.execute(refresh_token)

    # Clear cookie
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth",
        httponly=True,
        samesite="strict"
    )
    return {"detail": "Logged out successfully"}
