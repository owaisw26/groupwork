from typing import Any
from uuid import UUID, uuid4

from psycopg2.extensions import connection

MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_PROJECT_SIZE = 50 * 1024 * 1024


def create_evidence_record(
    conn: connection,
    *,
    task_id: str | UUID,
    user_id: str | UUID,
    s3_key: str,
    original_filename: str,
    file_size: int,
    mime_type: str,
    evidence_id: str | UUID | None = None,
) -> dict[str, Any]:
    record_id = str(evidence_id or uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO evidence_files (
                id, task_id, user_id, s3_key, original_filename, file_size, mime_type
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, task_id, user_id, s3_key, original_filename,
                      file_size, mime_type, uploaded_at
            """,
            (
                record_id,
                str(task_id),
                str(user_id),
                s3_key,
                original_filename,
                file_size,
                mime_type,
            ),
        )
        row = cur.fetchone()
    return _public_evidence(_row_to_evidence(row))


def get_evidence_by_s3_key(conn: connection, s3_key: str) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, task_id, user_id, s3_key, original_filename,
                   file_size, mime_type, uploaded_at
            FROM evidence_files
            WHERE s3_key = %s
            """,
            (s3_key,),
        )
        row = cur.fetchone()
    if not row:
        return None
    return _row_to_evidence(row)


def get_evidence_record(
    conn: connection,
    evidence_id: str | UUID,
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, task_id, user_id, s3_key, original_filename,
                   file_size, mime_type, uploaded_at
            FROM evidence_files
            WHERE id = %s
            """,
            (str(evidence_id),),
        )
        row = cur.fetchone()
    if not row:
        return None
    return _row_to_evidence(row)


def list_task_evidence(conn: connection, task_id: str | UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT e.id, e.task_id, e.user_id, e.s3_key, e.original_filename,
                   e.file_size, e.mime_type, e.uploaded_at, u.full_name
            FROM evidence_files e
            JOIN users u ON u.id = e.user_id
            WHERE e.task_id = %s
            ORDER BY e.uploaded_at DESC
            """,
            (str(task_id),),
        )
        rows = cur.fetchall()
    return [_row_to_evidence(row[:8], user_name=row[8]) for row in rows]


def list_project_evidence(conn: connection, project_id: str | UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT e.id, e.task_id, e.user_id, e.s3_key, e.original_filename,
                   e.file_size, e.mime_type, e.uploaded_at, u.full_name, t.title
            FROM evidence_files e
            JOIN tasks t ON t.id = e.task_id
            JOIN users u ON u.id = e.user_id
            WHERE t.project_id = %s
            ORDER BY e.uploaded_at DESC
            """,
            (str(project_id),),
        )
        rows = cur.fetchall()
    return [
        {**_row_to_evidence(row[:8], user_name=row[8]), "task_title": row[9]}
        for row in rows
    ]


def get_project_total_size(conn: connection, project_id: str | UUID) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COALESCE(SUM(e.file_size), 0)
            FROM evidence_files e
            JOIN tasks t ON t.id = e.task_id
            WHERE t.project_id = %s
            """,
            (str(project_id),),
        )
        return int(cur.fetchone()[0])


def _row_to_evidence(row: tuple, *, user_name: str | None = None) -> dict[str, Any]:
    data = {
        "id": row[0],
        "task_id": row[1],
        "user_id": row[2],
        "s3_key": row[3],
        "original_filename": row[4],
        "file_size": row[5],
        "mime_type": row[6],
        "uploaded_at": row[7],
    }
    if user_name is not None:
        data["user_name"] = user_name
    return data


def _public_evidence(
    evidence: dict[str, Any],
    *,
    user_name: str | None = None,
) -> dict[str, Any]:
    data = {
        "id": str(evidence["id"]),
        "task_id": str(evidence["task_id"]),
        "user_id": str(evidence["user_id"]),
        "original_filename": evidence["original_filename"],
        "file_size": evidence["file_size"],
        "mime_type": evidence["mime_type"],
        "uploaded_at": evidence["uploaded_at"].isoformat(),
    }
    if user_name is not None:
        data["user_name"] = user_name
    return data
