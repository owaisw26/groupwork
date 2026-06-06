import secrets
import string
from datetime import datetime, timedelta, timezone
from uuid import UUID

import psycopg2
from fastapi import HTTPException, status
from psycopg2.extensions import connection

from app.db.queries import projects as project_queries

JOIN_CODE_CHARS = string.ascii_uppercase + string.digits
JOIN_CODE_TTL_DAYS = 7


def generate_join_code() -> str:
    return "".join(secrets.choice(JOIN_CODE_CHARS) for _ in range(6))


def _create_unique_join_code(conn: connection) -> str:
    for _ in range(10):
        code = generate_join_code()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM projects WHERE join_code = %s AND deleted_at IS NULL",
                (code,),
            )
            if not cur.fetchone():
                return code
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Unable to generate join code",
    )


def _join_code_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=JOIN_CODE_TTL_DAYS)


def _public_project(project: dict, *, member_count: int | None = None) -> dict:
    data = {
        "id": str(project["id"]),
        "name": project["name"],
        "description": project["description"],
        "course": project["course"],
        "due_date": project["due_date"].isoformat() if project["due_date"] else None,
        "status": project["status"],
        "owner_id": str(project["owner_id"]),
        "join_code": project["join_code"],
        "join_code_expires_at": project["join_code_expires_at"].isoformat(),
        "max_members": project["max_members"],
        "created_at": project["created_at"].isoformat(),
    }
    if member_count is not None:
        data["member_count"] = member_count
    elif "member_count" in project:
        data["member_count"] = project["member_count"]
    return data


def _require_member(conn: connection, project_id: str | UUID, user_id: str | UUID) -> dict:
    project = project_queries.get_project(conn, project_id)
    if not project or project["deleted_at"] is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if not project_queries.is_project_member(conn, project_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")
    return project


def _require_owner(conn: connection, project_id: str | UUID, user_id: str | UUID) -> dict:
    project = _require_member(conn, project_id, user_id)
    if str(project["owner_id"]) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner can do this",
        )
    return project


def create_project(
    conn: connection,
    user: dict,
    *,
    name: str,
    description: str | None,
    course: str | None,
    due_date,
    max_members: int,
) -> dict:
    join_code = _create_unique_join_code(conn)
    try:
        project = project_queries.create_project(
            conn,
            name=name,
            description=description,
            course=course,
            due_date=due_date,
            owner_id=user["id"],
            join_code=join_code,
            join_code_expires_at=_join_code_expiry(),
            max_members=max_members,
        )
    except psycopg2.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to create project",
        ) from None
    project_queries.add_member(conn, project["id"], user["id"])
    _log_activity(conn, project["id"], user["id"], "project_created", "project", project["id"])
    return _public_project(project, member_count=1)


def list_projects(conn: connection, user_id: str | UUID) -> list[dict]:
    projects = project_queries.list_user_projects(conn, user_id)
    return [_public_project(project) for project in projects]


def get_project(conn: connection, project_id: str | UUID, user_id: str | UUID) -> dict:
    project = _require_member(conn, project_id, user_id)
    member_count = project_queries.get_member_count(conn, project_id)
    return _public_project(project, member_count=member_count)


def update_project(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
    **fields,
) -> dict:
    _require_owner(conn, project_id, user_id)
    if fields.get("max_members") is not None:
        member_count = project_queries.get_member_count(conn, project_id)
        if fields["max_members"] < member_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Max members cannot be less than current member count",
            )
    updated = project_queries.update_project(conn, project_id, **fields)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    member_count = project_queries.get_member_count(conn, project_id)
    return _public_project(updated, member_count=member_count)


def delete_project(conn: connection, project_id: str | UUID, user_id: str | UUID) -> None:
    _require_owner(conn, project_id, user_id)
    if not project_queries.soft_delete_project(conn, project_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")


def regenerate_join_code(conn: connection, project_id: str | UUID, user_id: str | UUID) -> dict:
    _require_owner(conn, project_id, user_id)
    updated = project_queries.regenerate_join_code(
        conn,
        project_id,
        join_code=_create_unique_join_code(conn),
        join_code_expires_at=_join_code_expiry(),
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    member_count = project_queries.get_member_count(conn, project_id)
    return _public_project(updated, member_count=member_count)


def join_project(conn: connection, user: dict, join_code: str) -> dict:
    project = project_queries.get_project_by_join_code(conn, join_code.upper())
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid join code")

    if project["join_code_expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Join code expired")

    if project_queries.is_project_member(conn, project["id"], user["id"]):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already a member")

    if project_queries.get_member_count(conn, project["id"]) >= project["max_members"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project is full")

    project_queries.add_member(conn, project["id"], user["id"])
    _log_activity(conn, project["id"], user["id"], "member_joined", "user", user["id"])
    member_count = project_queries.get_member_count(conn, project["id"])
    return _public_project(project, member_count=member_count)


def leave_project(conn: connection, project_id: str | UUID, user_id: str | UUID) -> None:
    project = _require_member(conn, project_id, user_id)
    if str(project["owner_id"]) == str(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Owner must transfer ownership before leaving",
        )
    project_queries.remove_member(conn, project_id, user_id)
    _log_activity(conn, project_id, user_id, "member_left", "user", user_id)


def transfer_ownership(
    conn: connection,
    project_id: str | UUID,
    owner_id: str | UUID,
    new_owner_id: str | UUID,
) -> dict:
    _require_owner(conn, project_id, owner_id)
    if str(owner_id) == str(new_owner_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer to self",
        )
    if not project_queries.is_project_member(conn, project_id, new_owner_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New owner must be a member",
        )
    updated = project_queries.transfer_ownership(conn, project_id, new_owner_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    _log_activity(conn, project_id, owner_id, "ownership_transferred", "project", project_id)
    member_count = project_queries.get_member_count(conn, project_id)
    return _public_project(updated, member_count=member_count)


def list_members(conn: connection, project_id: str | UUID, user_id: str | UUID) -> list[dict]:
    _require_member(conn, project_id, user_id)
    return project_queries.get_project_members(conn, project_id)


def _log_activity(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
    action_type: str,
    entity_type: str,
    entity_id: str | UUID,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO activity_log (project_id, user_id, action_type, entity_type, entity_id)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (str(project_id), str(user_id), action_type, entity_type, str(entity_id)),
        )
