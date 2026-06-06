from datetime import date

from pydantic import BaseModel, Field


class CreateProjectRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    course: str | None = Field(default=None, max_length=255)
    due_date: date | None = None
    max_members: int = Field(default=6, ge=2, le=20)


class UpdateProjectRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    course: str | None = Field(default=None, max_length=255)
    due_date: date | None = None
    max_members: int | None = Field(default=None, ge=2, le=20)
