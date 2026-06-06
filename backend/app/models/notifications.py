from pydantic import BaseModel


class UpdateNotificationPreferenceRequest(BaseModel):
    notification_type: str
    email_enabled: bool
