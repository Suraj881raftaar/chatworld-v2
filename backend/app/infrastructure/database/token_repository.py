from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.application.interfaces.token_repository import TokenRepository
from app.infrastructure.database.models import RefreshTokenModel

class SqlAlchemyTokenRepository(TokenRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_token(self, user_id: UUID, token: str, expires_at: datetime) -> None:
        db_token = RefreshTokenModel(
            user_id=user_id,
            token=token,
            expires_at=expires_at,
            is_revoked=False
        )
        self.session.add(db_token)
        await self.session.commit()

    async def get_valid_token(self, token: str) -> UUID | None:
        stmt = select(RefreshTokenModel).where(
            RefreshTokenModel.token == token,
            RefreshTokenModel.is_revoked == False
        )
        result = await self.session.execute(stmt)
        db_token = result.scalar_one_or_none()

        if db_token:
            # Check expiration
            # Convert expires_at to aware timezone if database doesn't store it
            db_expire = db_token.expires_at.replace(tzinfo=timezone.utc) if db_token.expires_at.tzinfo is None else db_token.expires_at
            if db_expire > datetime.now(timezone.utc):
                return db_token.user_id
        return None

    async def revoke_token(self, token: str) -> None:
        stmt = (
            update(RefreshTokenModel)
            .where(RefreshTokenModel.token == token)
            .values(is_revoked=True)
        )
        await self.session.execute(stmt)
        await self.session.commit()
