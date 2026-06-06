from pydantic import BaseModel, Field


class DisputeTaskRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=5000)
