from pydantic import BaseModel, Field


class RequestEvidenceUploadBody(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: str = Field(min_length=1, max_length=127)
    file_size: int = Field(gt=0)


class ConfirmEvidenceUploadBody(BaseModel):
    evidence_id: str = Field(min_length=1)
