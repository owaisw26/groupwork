from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from psycopg2.extensions import connection

from app.db.connection import get_connection
from app.middleware.auth import get_verified_user
from app.models.meetings import CreateMeetingRequest, UpdateMeetingRequest
from app.services import meetings as meeting_service

router = APIRouter(tags=["meetings"])


def _get_db() -> connection:
    with get_connection() as conn:
        yield conn


@router.post("/projects/{project_id}/meetings", status_code=status.HTTP_201_CREATED)
def create_meeting(
    project_id: UUID,
    request: Request,
    body: CreateMeetingRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return meeting_service.create_meeting(
        conn,
        project_id,
        user,
        meeting_date=body.meeting_date,
        agenda=body.agenda,
        discussion_points=body.discussion_points,
        action_items=body.action_items,
        notes=body.notes,
        attendee_ids=body.attendee_ids,
        create_tasks_from_action_items=body.create_tasks_from_action_items,
    )


@router.get("/projects/{project_id}/meetings")
def list_meetings(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return meeting_service.list_project_meetings(conn, project_id, user["id"])


@router.put("/projects/{project_id}/meetings/{meeting_id}")
def update_meeting(
    project_id: UUID,
    meeting_id: UUID,
    request: Request,
    body: UpdateMeetingRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return meeting_service.update_meeting(
        conn,
        project_id,
        meeting_id,
        user["id"],
        meeting_date=body.meeting_date,
        agenda=body.agenda,
        discussion_points=body.discussion_points,
        action_items=body.action_items,
        notes=body.notes,
        attendee_ids=body.attendee_ids,
    )


@router.get("/projects/{project_id}/members/{member_id}/attendance-rate")
def get_attendance_rate(
    project_id: UUID,
    member_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return meeting_service.get_member_attendance_rate(
        conn, project_id, member_id, user["id"]
    )
