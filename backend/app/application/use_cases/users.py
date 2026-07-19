from app.domain.entities.user import User
from app.domain.exceptions import UserAlreadyExistsException
from app.application.interfaces.user_repository import UserRepository
from app.schemas.user import UserUpdate

class UpdateUserProfileUseCase:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def execute(self, user: User, schema: UserUpdate) -> User:
        if schema.username and schema.username != user.username:
            # Check if username is already taken by another account
            existing = await self.user_repo.get_by_username(schema.username)
            if existing and existing.id != user.id:
                raise UserAlreadyExistsException("Username is already taken")
        
        user.update_profile(
            username=schema.username,
            status_message=schema.status_message,
            avatar_url=schema.avatar_url
        )
        
        saved_user = await self.user_repo.save(user)
        return saved_user


class SearchUsersUseCase:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def execute(self, query: str) -> list[User]:
        if not query.strip():
            return []
        return await self.user_repo.search(query)
