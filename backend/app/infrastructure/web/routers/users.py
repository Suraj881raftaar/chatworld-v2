from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.database.session import get_db
from app.infrastructure.database.repository import SqlAlchemyUserRepository
from app.infrastructure.security.dependencies import get_current_user
from app.application.use_cases.users import UpdateUserProfileUseCase, SearchUsersUseCase
from app.domain.entities.user import User
from app.schemas.auth import UserOut
from app.schemas.user import UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
async def update_me(
    schema: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_repo = SqlAlchemyUserRepository(db)
    use_case = UpdateUserProfileUseCase(user_repo)
    updated_user = await use_case.execute(current_user, schema)
    return updated_user


@router.get("/search", response_model=list[UserOut])
async def search_users(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_repo = SqlAlchemyUserRepository(db)
    use_case = SearchUsersUseCase(user_repo)
    results = await use_case.execute(q)
    return results
