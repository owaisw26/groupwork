from datetime import date
from typing import Any

from pydantic import BaseModel, Field, field_validator


class CreateTaskRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    status: str = Field(default="todo")
    priority: str = Field(default="medium")
    due_date: date | None = None
    assignee_ids: list[str] = Field(default_factory=list)


class UpdateTaskRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    priority: str | None = None
    due_date: date | None = None
    assignee_ids: list[str] | None = None


class UpdateTaskStatusRequest(BaseModel):
    status: str = Field(min_length=1)


class CreateSubtaskRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class ToggleSubtaskRequest(BaseModel):
    is_completed: bool


class CreateCommentRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class UpdateCommentRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class EditRequestBody(BaseModel):
    proposed_changes: dict[str, Any]


class ReviewEditRequestBody(BaseModel):
    approved: bool


class CreateTimeLogRequest(BaseModel):
    hours: float = Field(gt=0, le=24)
    date: date
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("date")
    @classmethod
    def date_not_in_future(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Date cannot be in the future")
        return value
