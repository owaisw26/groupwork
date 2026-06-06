from datetime import date, datetime

from pydantic import BaseModel, Field


class ActionItemInput(BaseModel):
    description: str = Field(min_length=1, max_length=500)
    assignee_id: str | None = None
    due_date: date | None = None
    create_as_task: bool = False


class CreateMeetingRequest(BaseModel):
    meeting_date: datetime
    agenda: str | None = Field(default=None, max_length=5000)
    discussion_points: str | None = Field(default=None, max_length=5000)
    action_items: list[ActionItemInput] = Field(default_factory=list)
    notes: str | None = Field(default=None, max_length=5000)
    attendee_ids: list[str] = Field(default_factory=list)
    create_tasks_from_action_items: bool = False


class UpdateMeetingRequest(BaseModel):
    meeting_date: datetime | None = None
    agenda: str | None = Field(default=None, max_length=5000)
    discussion_points: str | None = Field(default=None, max_length=5000)
    action_items: list[ActionItemInput] | None = None
    notes: str | None = Field(default=None, max_length=5000)
    attendee_ids: list[str] | None = None
