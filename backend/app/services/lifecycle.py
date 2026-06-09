from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from psycopg2.extensions import connection

from app.db.queries import projects as project_queries
from app.services import notifications as notification_service

STATUS_ACTIVE = "active"
STATUS_PEER_REVIEW = "peer_review"
STATUS_COMPLETED = "completed"
STATUS_REPORT_GENERATED = "report_generated"
STATUS_ARCHIVED = "archived"

PEER_REVIEW_DURATION_DAYS = 7
READ_ONLY_PROJECT_STATUSES = {
    STATUS_PEER_REVIEW,
    STATUS_COMPLETED,
    STATUS_REPORT_GENERATED,
    STATUS_ARCHIVED,
}

ALLOWED_TRANSITIONS = {
    STATUS_ACTIVE: STATUS_PEER_REVIEW,
    STATUS_COMPLETED: STATUS_REPORT_GENERATED,
    STATUS_REPORT_GENERATED: STATUS_ARCHIVED,
}


def _require_owner_project_for_update(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
) -> dict:
    project = project_queries.get_project_for_update(conn, project_id)
    if not project or project["deleted_at"] is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if not project_queries.is_project_member(conn, project_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")
    if str(project["owner_id"]) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner can do this",
        )
    return project


def _validate_transition(current_status: str, expected_current: str, next_status: str) -> None:
    if current_status == next_status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Project is already in {next_status} state",
        )
    allowed_next = ALLOWED_TRANSITIONS.get(current_status)
    if allowed_next != next_status or expected_current != current_status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot transition project from {current_status} to {next_status}",
        )


def _notify_project_completed(
    conn: connection,
    *,
    project: dict,
    actor_id: str | UUID,
) -> None:
    members = project_queries.get_project_members(conn, project["id"])
    for member in members:
        if str(member["id"]) == str(actor_id):
            continue
        notification_service.notify(
            conn,
            user_id=member["id"],
            notification_type="peer_review",
            title="Peer review phase started",
            message=f"Project '{project['name']}' moved to peer review.",
            entity_type="project",
            entity_id=project["id"],
            recipient_email=member.get("email"),
            email_subject=f"GroupWork: Peer review opened for {project['name']}",
        )


def generate_report(project: dict) -> str:
    return f"reports/{project['id']}.pdf"


def complete_project(conn: connection, project_id: str | UUID, user_id: str | UUID) -> dict:
    project = _require_owner_project_for_update(conn, project_id, user_id)
    _validate_transition(project["status"], STATUS_ACTIVE, STATUS_PEER_REVIEW)
    now = datetime.now(timezone.utc)
    updated = project_queries.update_project_status(
        conn,
        project_id,
        status=STATUS_PEER_REVIEW,
        completed_at=now,
        peer_review_ends_at=now + timedelta(days=PEER_REVIEW_DURATION_DAYS),
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    _notify_project_completed(conn, project=updated, actor_id=user_id)
    return updated


def generate_project_report(conn: connection, project_id: str | UUID, user_id: str | UUID) -> dict:
    project = _require_owner_project_for_update(conn, project_id, user_id)
    if project["status"] not in {STATUS_PEER_REVIEW, STATUS_COMPLETED}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot transition project from {project['status']} "
                f"to {STATUS_REPORT_GENERATED}"
            ),
        )
    updated = project_queries.update_project_status(
        conn,
        project_id,
        status=STATUS_REPORT_GENERATED,
        report_s3_key=generate_report(project),
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    members = project_queries.get_project_members(conn, project_id)
    for member in members:
        notification_service.notify(
            conn,
            user_id=member["id"],
            notification_type="report_ready",
            title="Contribution report ready",
            message=f"The contribution report for '{updated['name']}' is ready to view.",
            entity_type="project",
            entity_id=project_id,
            recipient_email=member.get("email"),
        )
    return updated


def archive_project(conn: connection, project_id: str | UUID, user_id: str | UUID) -> dict:
    project = _require_owner_project_for_update(conn, project_id, user_id)
    _validate_transition(project["status"], STATUS_REPORT_GENERATED, STATUS_ARCHIVED)
    updated = project_queries.update_project_status(
        conn,
        project_id,
        status=STATUS_ARCHIVED,
        archived_at=datetime.now(timezone.utc),
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return updated


def assert_project_writable(conn: connection, project_id: str | UUID) -> None:
    project = project_queries.get_project(conn, project_id)
    if not project or project["deleted_at"] is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if project["status"] in READ_ONLY_PROJECT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Project is read-only while status is {project['status']}",
        )
