from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from psycopg2.extensions import connection

from app.db.connection import get_connection
from app.middleware.auth import get_verified_user
from app.models.projects import CreateProjectRequest, UpdateProjectRequest
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
