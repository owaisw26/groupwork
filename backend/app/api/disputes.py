from uuid import UUID

from fastapi import APIRouter, Depends, Request
from psycopg2.extensions import connection

from app.db.connection import get_connection
from app.middleware.auth import get_verified_user
from app.models.disputes import CastDisputeVoteRequest
from app.services import disputes as dispute_service

router = APIRouter(tags=["disputes"])


def _get_db() -> connection:
    with get_connection() as conn:
        yield conn


@router.post("/disputes/{dispute_id}/vote")
def cast_dispute_vote(
    dispute_id: UUID,
    request: Request,
    body: CastDisputeVoteRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return dispute_service.cast_vote(
        conn,
        dispute_id,
        user["id"],
        vote=body.vote,
    )
