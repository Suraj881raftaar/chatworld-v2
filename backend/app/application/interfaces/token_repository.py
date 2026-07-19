from abc import ABC, abstractmethod
from uuid import UUID
from datetime import datetime

class TokenRepository(ABC):
    @abstractmethod
    async def create_token(self, user_id: UUID, token: str, expires_at: datetime) -> None:
        pass

    @abstractmethod
    async def get_valid_token(self, token: str) -> UUID | None:
        """Returns the user_id if the token is valid, unrevoked, and unexpired, else None."""
        pass

    @abstractmethod
    async def revoke_token(self, token: str) -> None:
        pass
