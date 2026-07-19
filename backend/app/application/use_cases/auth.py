from datetime import datetime, timedelta, timezone
from uuid import UUID
from app.domain.entities.user import User
from app.domain.exceptions import (
    UserAlreadyExistsException,
    InvalidCredentialsException,
    UserSuspendedException,
    TokenInvalidException
)
from app.application.interfaces.user_repository import UserRepository
from app.application.interfaces.token_repository import TokenRepository
from app.infrastructure.security.password import hash_password, verify_password
from app.infrastructure.security.jwt import create_access_token, create_refresh_token
from app.schemas.auth import UserRegister, UserLogin
from app.core.config import settings

class RegisterUserUseCase:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def execute(self, schema: UserRegister) -> User:
        # Check if email is already taken
        existing_email = await self.user_repo.get_by_email(schema.email)
        if existing_email:
            raise UserAlreadyExistsException("Email is already registered")

        # Check if username is already taken
        existing_username = await self.user_repo.get_by_username(schema.username)
        if existing_username:
            raise UserAlreadyExistsException("Username is already taken")

        # Create new user
        hashed = hash_password(schema.password)
        new_user = User(
            username=schema.username,
            email=schema.email,
            hashed_password=hashed,
            role="user"
        )
        
        saved_user = await self.user_repo.save(new_user)
        return saved_user


class LoginUserUseCase:
    def __init__(self, user_repo: UserRepository, token_repo: TokenRepository):
        self.user_repo = user_repo
        self.token_repo = token_repo

    async def execute(self, schema: UserLogin) -> tuple[str, str, User]:
        user = await self.user_repo.get_by_email(schema.email)
        if not user:
            raise InvalidCredentialsException()

        if not verify_password(schema.password, user.hashed_password):
            raise InvalidCredentialsException()

        if not user.is_active:
            raise UserSuspendedException()

        # Generate tokens
        access_payload = {
            "sub": str(user.id),
            "username": user.username,
            "role": user.role
        }
        access_token = create_access_token(access_payload)
        refresh_token = create_refresh_token()

        # Save refresh token to DB
        expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        await self.token_repo.create_token(
            user_id=user.id,
            token=refresh_token,
            expires_at=expires_at
        )

        return access_token, refresh_token, user


class RefreshTokenUseCase:
    def __init__(self, user_repo: UserRepository, token_repo: TokenRepository):
        self.user_repo = user_repo
        self.token_repo = token_repo

    async def execute(self, refresh_token: str) -> str:
        user_id = await self.token_repo.get_valid_token(refresh_token)
        if not user_id:
            raise TokenInvalidException("Invalid or expired refresh token")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise TokenInvalidException("User associated with token not found")

        if not user.is_active:
            raise UserSuspendedException()

        # Generate new access token
        access_payload = {
            "sub": str(user.id),
            "username": user.username,
            "role": user.role
        }
        new_access_token = create_access_token(access_payload)
        return new_access_token


class LogoutUserUseCase:
    def __init__(self, token_repo: TokenRepository):
        self.token_repo = token_repo

    async def execute(self, refresh_token: str) -> None:
        await self.token_repo.revoke_token(refresh_token)
