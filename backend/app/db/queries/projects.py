from datetime import date, datetime
from typing import Any
from uuid import UUID

from psycopg2.extensions import connection


def create_project(
    conn: connection,
    *,
    name: str,
    description: str | None,
    course: str | None,
    due_date: date | None,
    owner_id: str | UUID,
    join_code: str,
    join_code_expires_at: datetime,
    max_members: int,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO projects (
                name, description, course, due_date, owner_id,
                join_code, join_code_expires_at, max_members
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, name, description, course, due_date, status, owner_id,
                      join_code, join_code_expires_at, max_members, deleted_at, created_at
            """,
            (
                name,
                description,
                course,
                due_date,
                str(owner_id),
                join_code,
                join_code_expires_at,
                max_members,
            ),
        )
        row = cur.fetchone()
    return _row_to_project(row)


def get_project(conn: connection, project_id: str | UUID) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, name, description, course, due_date, status, owner_id,
                   join_code, join_code_expires_at, max_members, deleted_at, created_at
            FROM projects
            WHERE id = %s
            """,
            (str(project_id),),
        )
        row = cur.fetchone()
    return _row_to_project(row) if row else None


def get_project_for_update(conn: connection, project_id: str | UUID) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, name, description, course, due_date, status, owner_id,
                   join_code, join_code_expires_at, max_members, deleted_at, created_at
            FROM projects
            WHERE id = %s
            FOR UPDATE
            """,
            (str(project_id),),
        )
        row = cur.fetchone()
    return _row_to_project(row) if row else None


def list_user_projects(conn: connection, user_id: str | UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT p.id, p.name, p.description, p.course, p.due_date, p.status, p.owner_id,
                   p.join_code, p.join_code_expires_at, p.max_members, p.deleted_at, p.created_at,
                   COUNT(pm.user_id) AS member_count
            FROM projects p
            JOIN project_members pm_self ON pm_self.project_id = p.id AND pm_self.user_id = %s
            JOIN project_members pm ON pm.project_id = p.id
            WHERE p.deleted_at IS NULL
            GROUP BY p.id
            ORDER BY p.created_at DESC
            """,
            (str(user_id),),
        )
        rows = cur.fetchall()
    return [_row_to_project(row[:12], member_count=row[12]) for row in rows]


def update_project(
    conn: connection,
    project_id: str | UUID,
    *,
    name: str | None = None,
    description: str | None = None,
    course: str | None = None,
    due_date: date | None = None,
    max_members: int | None = None,
) -> dict[str, Any] | None:
    updates: list[str] = []
    params: list[object] = []

    if name is not None:
        updates.append("name = %s")
        params.append(name)
    if description is not None:
        updates.append("description = %s")
        params.append(description)
    if course is not None:
        updates.append("course = %s")
        params.append(course)
    if due_date is not None:
        updates.append("due_date = %s")
        params.append(due_date)
    if max_members is not None:
        updates.append("max_members = %s")
        params.append(max_members)

    if not updates:
        return get_project(conn, project_id)

    params.extend([str(project_id)])
    with conn.cursor() as cur:
        cur.execute(
            f"""
            UPDATE projects SET {", ".join(updates)}
            WHERE id = %s AND deleted_at IS NULL
            RETURNING id, name, description, course, due_date, status, owner_id,
                      join_code, join_code_expires_at, max_members, deleted_at, created_at
            """,
            tuple(params),
        )
        row = cur.fetchone()
    return _row_to_project(row) if row else None


def soft_delete_project(conn: connection, project_id: str | UUID) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE projects SET deleted_at = NOW()
            WHERE id = %s AND deleted_at IS NULL
            RETURNING id
            """,
            (str(project_id),),
        )
        return cur.fetchone() is not None


def get_member_count(conn: connection, project_id: str | UUID) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM project_members WHERE project_id = %s",
            (str(project_id),),
        )
        return cur.fetchone()[0]


def is_project_member(conn: connection, project_id: str | UUID, user_id: str | UUID) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1 FROM project_members
            WHERE project_id = %s AND user_id = %s
            """,
            (str(project_id), str(user_id)),
        )
        return cur.fetchone() is not None


def add_member(conn: connection, project_id: str | UUID, user_id: str | UUID) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO project_members (project_id, user_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
            """,
            (str(project_id), str(user_id)),
        )


def remove_member(conn: connection, project_id: str | UUID, user_id: str | UUID) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM project_members WHERE project_id = %s AND user_id = %s",
            (str(project_id), str(user_id)),
        )


def transfer_ownership(
    conn: connection,
    project_id: str | UUID,
    new_owner_id: str | UUID,
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE projects SET owner_id = %s
            WHERE id = %s AND deleted_at IS NULL
            RETURNING id, name, description, course, due_date, status, owner_id,
                      join_code, join_code_expires_at, max_members, deleted_at, created_at
            """,
            (str(new_owner_id), str(project_id)),
        )
        row = cur.fetchone()
    return _row_to_project(row) if row else None


def regenerate_join_code(
    conn: connection,
    project_id: str | UUID,
    *,
    join_code: str,
    join_code_expires_at: datetime,
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE projects
            SET join_code = %s, join_code_expires_at = %s
            WHERE id = %s AND deleted_at IS NULL
            RETURNING id, name, description, course, due_date, status, owner_id,
                      join_code, join_code_expires_at, max_members, deleted_at, created_at
            """,
            (join_code, join_code_expires_at, str(project_id)),
        )
        row = cur.fetchone()
    return _row_to_project(row) if row else None


def get_project_by_join_code(conn: connection, join_code: str) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, name, description, course, due_date, status, owner_id,
                   join_code, join_code_expires_at, max_members, deleted_at, created_at
            FROM projects
            WHERE join_code = %s AND deleted_at IS NULL
            """,
            (join_code,),
        )
        row = cur.fetchone()
    return _row_to_project(row) if row else None


def get_project_by_join_code_for_update(
    conn: connection,
    join_code: str,
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, name, description, course, due_date, status, owner_id,
                   join_code, join_code_expires_at, max_members, deleted_at, created_at
            FROM projects
            WHERE join_code = %s AND deleted_at IS NULL
            FOR UPDATE
            """,
            (join_code,),
        )
        row = cur.fetchone()
    return _row_to_project(row) if row else None


def get_project_members(conn: connection, project_id: str | UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT u.id, u.email, u.full_name, pm.joined_at, p.owner_id
            FROM project_members pm
            JOIN users u ON u.id = pm.user_id
            JOIN projects p ON p.id = pm.project_id
            WHERE pm.project_id = %s
            ORDER BY pm.joined_at ASC
            """,
            (str(project_id),),
        )
        rows = cur.fetchall()
    return [
        {
            "id": str(row[0]),
            "email": row[1],
            "full_name": row[2],
            "joined_at": row[3].isoformat(),
            "role": "owner" if str(row[0]) == str(row[4]) else "member",
        }
        for row in rows
    ]


def get_user_project_ids(conn: connection, user_id: str | UUID) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT p.id
            FROM projects p
            JOIN project_members pm ON pm.project_id = p.id
            WHERE pm.user_id = %s AND p.deleted_at IS NULL
            """,
            (str(user_id),),
        )
        return [str(row[0]) for row in cur.fetchall()]


def _row_to_project(row: tuple, *, member_count: int | None = None) -> dict[str, Any]:
    project = {
        "id": row[0],
        "name": row[1],
        "description": row[2],
        "course": row[3],
        "due_date": row[4],
        "status": row[5],
        "owner_id": row[6],
        "join_code": row[7],
        "join_code_expires_at": row[8],
        "max_members": row[9],
        "deleted_at": row[10],
        "created_at": row[11],
    }
    if member_count is not None:
        project["member_count"] = member_count
    return project
