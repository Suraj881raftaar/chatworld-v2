from pydantic import BaseModel, Field

class UserUpdate(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=50)
    status_message: str | None = Field(None, max_length=150)
    avatar_url: str | None = Field(None, max_length=2048)
