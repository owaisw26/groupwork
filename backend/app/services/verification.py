from uuid import UUID

from fastapi import HTTPException, status
from psycopg2.extensions import connection

from app.db.queries import disputes as dispute_queries
from app.db.queries import projects as project_queries
from app.db.queries import tasks as task_queries
from app.db.queries import verifications as verification_queries


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


def _get_eligible_verifiers(conn: connection, task: dict) -> list[str]:
    members = project_queries.get_project_members(conn, task["project_id"])
    assignee_ids = {str(aid) for aid in task.get("assignee_ids", [])}
    return [str(member["id"]) for member in members if str(member["id"]) not in assignee_ids]


def _create_notification(
    conn: connection,
    *,
    user_id: str | UUID,
    notification_type: str,
    title: str,
    message: str,
    entity_type: str,
    entity_id: str | UUID,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO notifications (
                user_id, type, title, message, related_entity_type, related_entity_id
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                str(user_id),
                notification_type,
                title,
                message,
                entity_type,
                str(entity_id),
            ),
        )


def check_majority_verified(conn: connection, task_id: str | UUID) -> str:
    task = task_queries.get_task(conn, task_id)
    if not task:
        return "none"

    verifications = verification_queries.get_task_verifications(conn, task_id)
    if any(v["status"] == "disputed" for v in verifications):
        return "disputed"

    eligible = _get_eligible_verifiers(conn, task)
    if not eligible:
        return task["verification_status"]

    verified_count = sum(1 for v in verifications if v["status"] == "verified")
    if verified_count > len(eligible) / 2:
        return "verified"
    return "pending"


def _recalculate_verification_status(conn: connection, task_id: str | UUID) -> None:
    new_status = check_majority_verified(conn, task_id)
    verification_queries.update_task_verification_status(conn, task_id, new_status)


def notify_verification_needed(conn: connection, task: dict) -> None:
    members = project_queries.get_project_members(conn, task["project_id"])
    assignee_ids = {str(aid) for aid in task.get("assignee_ids", [])}
    for member in members:
        if str(member["id"]) in assignee_ids:
            continue
        _create_notification(
            conn,
            user_id=member["id"],
            notification_type="task_completed",
            title="Task verification needed",
            message=f"Task '{task['title']}' was marked done and needs your verification.",
            entity_type="task",
            entity_id=task["id"],
        )


def _ensure_task_awaiting_verification(task: dict) -> None:
    if task["status"] != "done":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is not awaiting verification",
        )


def _ensure_eligible_verifier(conn: connection, task: dict, user_id: str | UUID) -> None:
    eligible = _get_eligible_verifiers(conn, task)
    if str(user_id) not in eligible:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot verify your own task",
        )


def verify_task(conn: connection, task_id: str | UUID, user_id: str | UUID) -> dict:
    task = _require_task_access(conn, task_id, user_id)
    _ensure_task_awaiting_verification(task)
    _ensure_eligible_verifier(conn, task, user_id)

    existing = verification_queries.get_user_verification(conn, task_id, user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already submitted verification for this task",
        )

    verification = verification_queries.create_verification(
        conn,
        task_id=task_id,
        user_id=user_id,
        status="verified",
    )
    _recalculate_verification_status(conn, task_id)
    return verification


def dispute_task(
    conn: connection,
    task_id: str | UUID,
    user_id: str | UUID,
    *,
    reason: str,
) -> dict:
    task = _require_task_access(conn, task_id, user_id)
    _ensure_task_awaiting_verification(task)
    _ensure_eligible_verifier(conn, task, user_id)

    existing = verification_queries.get_user_verification(conn, task_id, user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already submitted verification for this task",
        )

    verification_queries.create_verification(
        conn,
        task_id=task_id,
        user_id=user_id,
        status="disputed",
    )
    dispute = dispute_queries.create_dispute(
        conn,
        task_id=task_id,
        filed_by=user_id,
        reason=reason,
    )
    verification_queries.update_task_verification_status(conn, task_id, "disputed")

    members = project_queries.get_project_members(conn, task["project_id"])
    for member in members:
        if str(member["id"]) == str(user_id):
            continue
        _create_notification(
            conn,
            user_id=member["id"],
            notification_type="dispute_filed",
            title="Dispute filed",
            message=f"A dispute was filed on task '{task['title']}'.",
            entity_type="task",
            entity_id=task_id,
        )

    return dispute


def list_task_verifications(
    conn: connection,
    task_id: str | UUID,
    user_id: str | UUID,
) -> dict:
    _require_task_access(conn, task_id, user_id)
    return {"items": verification_queries.get_task_verifications(conn, task_id)}
