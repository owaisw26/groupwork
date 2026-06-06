from datetime import datetime
from uuid import UUID

from fastapi import HTTPException, status
from psycopg2.extensions import connection

from app.db.queries import meetings as meeting_queries
from app.db.queries import projects as project_queries
from app.db.queries import tasks as task_queries


def _require_project_member(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
) -> dict:
    project = project_queries.get_project(conn, project_id)
    if not project or project["deleted_at"] is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if not project_queries.is_project_member(conn, project_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")
    return project


def _validate_attendees(
    conn: connection,
    project_id: str | UUID,
    attendee_ids: list[str],
) -> None:
    for attendee_id in attendee_ids:
        if not project_queries.is_project_member(conn, project_id, attendee_id):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"User {attendee_id} is not a project member",
            )


def _action_items_to_json(action_items: list) -> list[dict]:
    return [
        {
            "description": item.description,
            "assignee_id": item.assignee_id,
            "due_date": item.due_date.isoformat() if item.due_date else None,
            "create_as_task": item.create_as_task,
        }
        for item in action_items
    ]


def _create_tasks_from_action_items(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
    action_items: list,
    *,
    enabled: bool,
) -> None:
    if not enabled:
        return
    for item in action_items:
        if not item.create_as_task:
            continue
        assignee_ids = [item.assignee_id] if item.assignee_id else [str(user_id)]
        _validate_attendees(conn, project_id, assignee_ids)
        task_queries.create_task(
            conn,
            project_id=project_id,
            title=item.description,
            description="Created from meeting action item",
            status="todo",
            priority="medium",
            due_date=item.due_date,
            created_by=user_id,
            assignee_ids=assignee_ids,
        )


def create_meeting(
    conn: connection,
    project_id: str | UUID,
    user: dict,
    *,
    meeting_date: datetime,
    agenda: str | None,
    discussion_points: str | None,
    action_items: list,
    notes: str | None,
    attendee_ids: list[str],
    create_tasks_from_action_items: bool,
) -> dict:
    _require_project_member(conn, project_id, user["id"])
    _validate_attendees(conn, project_id, attendee_ids)

    meeting = meeting_queries.create_meeting(
        conn,
        project_id=project_id,
        meeting_date=meeting_date,
        agenda=agenda,
        discussion_points=discussion_points,
        action_items=_action_items_to_json(action_items),
        notes=notes,
        created_by=user["id"],
    )
    meeting_queries.set_meeting_attendance(
        conn, meeting["id"], attendee_ids, project_id
    )
    _create_tasks_from_action_items(
        conn,
        project_id,
        user["id"],
        action_items,
        enabled=create_tasks_from_action_items,
    )
    meeting["attendee_ids"] = meeting_queries.get_meeting_attendance(conn, meeting["id"])
    return meeting


def update_meeting(
    conn: connection,
    project_id: str | UUID,
    meeting_id: str | UUID,
    user_id: str | UUID,
    *,
    meeting_date: datetime | None = None,
    agenda: str | None = None,
    discussion_points: str | None = None,
    action_items: list | None = None,
    notes: str | None = None,
    attendee_ids: list[str] | None = None,
) -> dict:
    _require_project_member(conn, project_id, user_id)
    meeting = meeting_queries.get_meeting(conn, meeting_id)
    if not meeting or str(meeting["project_id"]) != str(project_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    project = project_queries.get_project(conn, project_id)
    is_owner = str(project["owner_id"]) == str(user_id)
    is_creator = str(meeting["created_by"]) == str(user_id)
    if not is_owner and not is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the meeting creator or project owner can edit",
        )

    if attendee_ids is not None:
        _validate_attendees(conn, project_id, attendee_ids)

    updated = meeting_queries.update_meeting(
        conn,
        meeting_id,
        meeting_date=meeting_date,
        agenda=agenda,
        discussion_points=discussion_points,
        action_items=_action_items_to_json(action_items) if action_items is not None else None,
        notes=notes,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    if attendee_ids is not None:
        meeting_queries.set_meeting_attendance(conn, meeting_id, attendee_ids, project_id)
    updated["attendee_ids"] = meeting_queries.get_meeting_attendance(conn, meeting_id)
    return updated


def list_project_meetings(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
) -> dict:
    _require_project_member(conn, project_id, user_id)
    return {"items": meeting_queries.list_project_meetings(conn, project_id)}


def get_member_attendance_rate(
    conn: connection,
    project_id: str | UUID,
    member_id: str | UUID,
    user_id: str | UUID,
) -> dict:
    _require_project_member(conn, project_id, user_id)
    if not project_queries.is_project_member(conn, project_id, member_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    rate = meeting_queries.get_member_attendance_rate(conn, project_id, member_id)
    return {"user_id": str(member_id), "attendance_rate": rate}
