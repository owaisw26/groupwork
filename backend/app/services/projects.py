import secrets
import string
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from psycopg2.extensions import connection

from app.db.queries import projects as project_queries

JOIN_CODE_CHARS = string.ascii_uppercase + string.digits
JOIN_CODE_TTL_DAYS = 7


def generate_join_code() -> str:
    return "".join(secrets.choice(JOIN_CODE_CHARS) for _ in range(6))


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
    join_code = generate_join_code()
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
        join_code=generate_join_code(),
        join_code_expires_at=_join_code_expiry(),
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    member_count = project_queries.get_member_count(conn, project_id)
    return _public_project(updated, member_count=member_count)


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
