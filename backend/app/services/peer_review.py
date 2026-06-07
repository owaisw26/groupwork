from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from psycopg2.extensions import connection

from app.db.queries import peer_reviews as peer_review_queries
from app.db.queries import projects as project_queries


def _require_member(conn: connection, project_id: str | UUID, user_id: str | UUID) -> dict:
    project = project_queries.get_project(conn, project_id)
    if not project or project["deleted_at"] is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if not project_queries.is_project_member(conn, project_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")
    return project


def _get_peer_review_deadline(conn: connection, project_id: str | UUID):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT peer_review_ends_at FROM projects WHERE id = %s",
            (str(project_id),),
        )
        row = cur.fetchone()
    return row[0] if row else None


def _is_peer_review_open(project: dict) -> bool:
    return project["status"] == "peer_review"


def submit_review(
    conn: connection,
    project_id: str | UUID,
    reviewer_id: str | UUID,
    *,
    reviewee_id: str | UUID,
    contribution_quality: int,
    communication: int,
    reliability: int,
    overall: int,
    comment: str | None,
) -> dict:
    project = _require_member(conn, project_id, reviewer_id)
    if not _is_peer_review_open(project):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Peer review is not open for this project",
        )

    deadline = _get_peer_review_deadline(conn, project_id)
    if deadline and deadline < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Peer review deadline has passed",
        )

    if str(reviewer_id) == str(reviewee_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot review yourself",
        )

    if not project_queries.is_project_member(conn, project_id, reviewee_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reviewee is not a project member",
        )

    if peer_review_queries.has_reviewed(conn, project_id, reviewer_id, reviewee_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already submitted review for this member",
        )

    review = peer_review_queries.create_review(
        conn,
        project_id=project_id,
        reviewer_id=reviewer_id,
        reviewee_id=reviewee_id,
        contribution_quality=contribution_quality,
        communication=communication,
        reliability=reliability,
        overall=overall,
        comment=comment,
    )
    return peer_review_queries._public_review(review)


def get_review_status(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
) -> dict:
    project = _require_member(conn, project_id, user_id)
    members = project_queries.get_project_members(conn, project_id)
    submitted_ids = set(peer_review_queries.get_submitted_reviewer_ids(conn, project_id))
    submitted_by = [m["email"] for m in members if m["id"] in submitted_ids]
    pending_members = [m for m in members if m["id"] not in submitted_ids]

    deadline = _get_peer_review_deadline(conn, project_id)
    now = datetime.now(timezone.utc)
    non_submitters = []
    if deadline and deadline < now:
        non_submitters = [m["email"] for m in pending_members]

    reviewed_reviewee_ids = [
        str(review["reviewee_id"])
        for review in peer_review_queries.get_reviewer_submissions(conn, project_id, user_id)
    ]

    return {
        "project_status": project["status"],
        "is_open": _is_peer_review_open(project),
        "submitted_count": len(submitted_ids),
        "total_members": len(members),
        "submitted_by": submitted_by,
        "pending_members": [
            {"id": m["id"], "email": m["email"], "full_name": m["full_name"]}
            for m in pending_members
        ],
        "reviewed_reviewee_ids": reviewed_reviewee_ids,
        "non_submitters": non_submitters,
        "peer_review_ends_at": deadline.isoformat() if deadline else None,
        "deadline_passed": bool(deadline and deadline < now),
    }


def get_aggregate_scores(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
) -> dict:
    _require_member(conn, project_id, user_id)
    return {"items": peer_review_queries.get_aggregate_scores(conn, project_id)}
