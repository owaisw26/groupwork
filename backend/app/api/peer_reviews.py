from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from psycopg2.extensions import connection

from app.db.connection import get_connection
from app.middleware.auth import get_verified_user
from app.models.peer_reviews import SubmitPeerReviewRequest
from app.services import peer_review as peer_review_service

router = APIRouter(tags=["peer-reviews"])


def _get_db() -> connection:
    with get_connection() as conn:
        yield conn


@router.post("/projects/{project_id}/peer-review", status_code=status.HTTP_201_CREATED)
def submit_peer_review(
    project_id: UUID,
    request: Request,
    body: SubmitPeerReviewRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return peer_review_service.submit_review(
        conn,
        project_id,
        user["id"],
        reviewee_id=body.reviewee_id,
        contribution_quality=body.contribution_quality,
        communication=body.communication,
        reliability=body.reliability,
        overall=body.overall,
        comment=body.comment,
    )


@router.get("/projects/{project_id}/peer-review/status")
def get_peer_review_status(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return peer_review_service.get_review_status(conn, project_id, user["id"])


@router.get("/projects/{project_id}/peer-review/aggregates")
def get_peer_review_aggregates(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return peer_review_service.get_aggregate_scores(conn, project_id, user["id"])
