from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from psycopg2.extensions import connection

from app.db.connection import get_connection
from app.middleware.auth import get_verified_user
from app.middleware.rate_limit import INVITE_RATE_LIMIT, JOIN_PROJECT_RATE_LIMIT, limiter
from app.models.projects import (
    CreateProjectRequest,
    InviteMemberRequest,
    JoinProjectRequest,
    TransferOwnershipRequest,
    UpdateProjectRequest,
)
from app.services import invitations as invitation_service
from app.services import lifecycle as lifecycle_service
from app.services import projects as project_service

router = APIRouter(prefix="/projects", tags=["projects"])


def _get_db() -> connection:
    with get_connection() as conn:
        yield conn


@router.post("", status_code=status.HTTP_201_CREATED)
def create_project(
    request: Request,
    body: CreateProjectRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return project_service.create_project(
        conn,
        user,
        name=body.name,
        description=body.description,
        course=body.course,
        due_date=body.due_date,
        max_members=body.max_members,
    )


@router.get("")
def list_projects(request: Request, conn: connection = Depends(_get_db)):
    user = get_verified_user(request)
    return project_service.list_projects(conn, user["id"])


@router.get("/{project_id}")
def get_project(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return project_service.get_project(conn, project_id, user["id"])


@router.put("/{project_id}")
def update_project(
    project_id: UUID,
    request: Request,
    body: UpdateProjectRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return project_service.update_project(
        conn,
        project_id,
        user["id"],
        name=body.name,
        description=body.description,
        course=body.course,
        due_date=body.due_date,
        max_members=body.max_members,
    )


@router.delete("/{project_id}")
def delete_project(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    project_service.delete_project(conn, project_id, user["id"])
    return {"status": "ok"}


@router.post("/{project_id}/regenerate-code")
def regenerate_join_code(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return project_service.regenerate_join_code(conn, project_id, user["id"])


@router.post("/join")
@limiter.limit(JOIN_PROJECT_RATE_LIMIT)
def join_project(
    request: Request,
    body: JoinProjectRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return project_service.join_project(conn, user, body.join_code)


@router.post("/{project_id}/invite", status_code=status.HTTP_201_CREATED)
@limiter.limit(INVITE_RATE_LIMIT)
def invite_member(
    project_id: UUID,
    request: Request,
    body: InviteMemberRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return invitation_service.invite_member(conn, project_id, user, body.email)


@router.get("/{project_id}/members")
def list_members(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return project_service.list_members(conn, project_id, user["id"])


@router.get("/{project_id}/activity")
def list_project_activity(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return project_service.list_project_activity(conn, project_id, user["id"])


@router.post("/{project_id}/leave")
def leave_project(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    project_service.leave_project(conn, project_id, user["id"])
    return {"status": "ok"}


@router.post("/{project_id}/transfer-ownership")
def transfer_ownership(
    project_id: UUID,
    request: Request,
    body: TransferOwnershipRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return project_service.transfer_ownership(
        conn, project_id, user["id"], body.new_owner_id
    )


@router.post("/{project_id}/complete")
def complete_project(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    lifecycle_service.complete_project(conn, project_id, user["id"])
    return project_service.get_project(conn, project_id, user["id"])


@router.post("/{project_id}/generate-report")
def generate_project_report(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    lifecycle_service.generate_project_report(conn, project_id, user["id"])
    return project_service.get_project(conn, project_id, user["id"])


@router.post("/{project_id}/archive")
def archive_project(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    lifecycle_service.archive_project(conn, project_id, user["id"])
    return project_service.get_project(conn, project_id, user["id"])
