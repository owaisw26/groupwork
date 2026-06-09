from uuid import UUID

from fastapi import HTTPException, status
from psycopg2.extensions import connection

from app.db.queries import disputes as dispute_queries
from app.db.queries import projects as project_queries
from app.db.queries import tasks as task_queries
from app.db.queries import verifications as verification_queries
from app.services import notifications as notification_service
from app.services import verification as verification_service


def _require_dispute_access(
    conn: connection,
    dispute_id: str | UUID,
    user_id: str | UUID,
) -> tuple[dict, dict, dict]:
    dispute = dispute_queries.get_dispute(conn, dispute_id)
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")

    task = task_queries.get_task(conn, dispute["task_id"])
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")

    project = project_queries.get_project(conn, task["project_id"])
    if not project or project["deleted_at"] is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")

    if not project_queries.is_project_member(conn, task["project_id"], user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")

    return dispute, task, project


def _require_task_access(conn: connection, task_id: str | UUID, user_id: str | UUID) -> dict:
    task = task_queries.get_task(conn, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    project = project_queries.get_project(conn, task["project_id"])
    if not project or project["deleted_at"] is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if not project_queries.is_project_member(conn, task["project_id"], user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")

    return task


def _enrich_dispute(conn: connection, dispute: dict) -> dict:
    public_dispute = dispute_queries.as_public_dispute(dispute)
    votes = dispute_queries.list_dispute_votes(conn, public_dispute["id"])
    task = task_queries.get_task(conn, public_dispute["task_id"])
    members = project_queries.get_project_members(conn, task["project_id"])
    uphold_count = sum(1 for vote in votes if vote["vote"] == "uphold")
    reject_count = sum(1 for vote in votes if vote["vote"] == "reject")
    return {
        **public_dispute,
        "votes": votes,
        "vote_summary": {
            "uphold": uphold_count,
            "reject": reject_count,
            "total_members": len(members),
        },
    }


def _determine_outcome(
    *,
    uphold_count: int,
    reject_count: int,
    member_count: int,
    votes_cast: int,
) -> str | None:
    if uphold_count > member_count / 2:
        return "upheld"
    if reject_count > member_count / 2:
        return "rejected"
    if votes_cast == member_count:
        return "upheld" if uphold_count > reject_count else "rejected"
    return None


def _notify_dispute_resolved(
    conn: connection,
    *,
    project_id: str | UUID,
    dispute: dict,
    task_title: str,
    outcome: str,
) -> None:
    members = project_queries.get_project_members(conn, project_id)
    for member in members:
        notification_service.notify(
            conn,
            user_id=member["id"],
            notification_type="dispute_resolved",
            title="Dispute resolved",
            message=(
                f"Dispute on task '{task_title}' was resolved as {outcome}."
            ),
            entity_type="dispute",
            entity_id=dispute["id"],
            recipient_email=member.get("email"),
        )


def _apply_resolution_to_task(conn: connection, dispute: dict, outcome: str) -> None:
    task_id = dispute["task_id"]
    filed_by = dispute["filed_by"]
    if outcome == "rejected":
        verification_queries.update_user_verification_status(
            conn,
            task_id,
            filed_by,
            "verified",
        )
        verification_service.recalculate_task_verification(conn, task_id)
        return

    verification_queries.update_task_verification_status(conn, task_id, "disputed")


def _maybe_resolve_dispute(
    conn: connection,
    *,
    dispute_id: str | UUID,
    task: dict,
    project_id: str | UUID,
) -> dict | None:
    dispute = dispute_queries.get_dispute(conn, dispute_id)
    if not dispute or dispute["status"] == "resolved":
        return dispute

    members = project_queries.get_project_members(conn, project_id)
    votes = dispute_queries.list_dispute_votes(conn, dispute_id)
    uphold_count = sum(1 for vote in votes if vote["vote"] == "uphold")
    reject_count = sum(1 for vote in votes if vote["vote"] == "reject")
    outcome = _determine_outcome(
        uphold_count=uphold_count,
        reject_count=reject_count,
        member_count=len(members),
        votes_cast=len(votes),
    )
    if not outcome:
        return dispute

    resolved = dispute_queries.resolve_dispute(conn, dispute_id, outcome=outcome)
    if not resolved:
        return dispute_queries.get_dispute(conn, dispute_id)

    _apply_resolution_to_task(conn, resolved, outcome)
    _notify_dispute_resolved(
        conn,
        project_id=project_id,
        dispute=resolved,
        task_title=task["title"],
        outcome=outcome,
    )
    return resolved


def cast_vote(
    conn: connection,
    dispute_id: str | UUID,
    user_id: str | UUID,
    *,
    vote: str,
) -> dict:
    dispute, _task, _project = _require_dispute_access(conn, dispute_id, user_id)

    if dispute["status"] == "resolved":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Dispute is already resolved",
        )

    if dispute_queries.get_user_vote(conn, dispute_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already voted on this dispute",
        )

    recorded_vote = dispute_queries.cast_vote(
        conn,
        dispute_id=dispute_id,
        user_id=user_id,
        vote=vote,
    )
    fresh_dispute = dispute_queries.get_dispute(conn, dispute_id)
    if fresh_dispute is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")
    return {
        "vote": recorded_vote["vote"],
        "dispute": _enrich_dispute(conn, fresh_dispute),
    }


def resolve_dispute(
    conn: connection,
    dispute_id: str | UUID,
    user_id: str | UUID,
) -> dict:
    dispute, task, _project = _require_dispute_access(conn, dispute_id, user_id)

    if dispute["status"] == "resolved":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Dispute is already resolved",
        )

    if str(dispute["filed_by"]) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the member who filed this dispute can resolve it",
        )

    resolved = dispute_queries.resolve_dispute(conn, dispute_id, outcome="resolved")
    if not resolved:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")

    verification_queries.delete_user_verification(conn, task["id"], user_id)
    verification_service.recalculate_task_verification(conn, task["id"])
    _notify_dispute_resolved(
        conn,
        project_id=task["project_id"],
        dispute=resolved,
        task_title=task["title"],
        outcome="resolved",
    )
    return _enrich_dispute(conn, resolved)


def list_task_disputes(
    conn: connection,
    task_id: str | UUID,
    user_id: str | UUID,
) -> dict:
    _require_task_access(conn, task_id, user_id)
    disputes = dispute_queries.list_task_disputes(conn, task_id)
    return {"items": [_enrich_dispute(conn, dispute) for dispute in disputes]}
