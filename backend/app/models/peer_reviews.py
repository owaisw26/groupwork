from pydantic import BaseModel, Field


class SubmitPeerReviewRequest(BaseModel):
    reviewee_id: str
    contribution_quality: int = Field(ge=1, le=5)
    communication: int = Field(ge=1, le=5)
    reliability: int = Field(ge=1, le=5)
    overall: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=5000)
