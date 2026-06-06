from typing import Literal

from pydantic import BaseModel

VALID_NOTIFICATION_TYPES = Literal[
    "task_assigned",
    "task_edit_request",
    "task_edit_request_reviewed",
    "task_completed",
    "dispute_filed",
    "invitation",
]


class UpdateNotificationPreferenceRequest(BaseModel):
    notification_type: VALID_NOTIFICATION_TYPES
    email_enabled: bool
