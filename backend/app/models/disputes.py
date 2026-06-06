from typing import Literal

from pydantic import BaseModel

DisputeVoteValue = Literal["uphold", "reject"]


class CastDisputeVoteRequest(BaseModel):
    vote: DisputeVoteValue
