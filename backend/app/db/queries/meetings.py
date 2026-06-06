import json
from datetime import datetime
from typing import Any
from uuid import UUID

from psycopg2.extensions import connection


def create_meeting(
    conn: connection,
    *,
    project_id: str | UUID,
    meeting_date: datetime,
    agenda: str | None,
    discussion_points: str | None,
    action_items: list[dict],
    notes: str | None,
    created_by: str | UUID,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO meetings (
                project_id, meeting_date, agenda, discussion_points,
                action_items_json, notes, created_by
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, project_id, meeting_date, agenda, discussion_points,
                      action_items_json, notes, created_by, created_at
            """,
            (
                str(project_id),
                meeting_date,
                agenda,
                discussion_points,
                json.dumps(action_items),
                notes,
                str(created_by),
            ),
        )
        row = cur.fetchone()
    return _public_meeting(_row_to_meeting(row))


def update_meeting(
    conn: connection,
    meeting_id: str | UUID,
    *,
    meeting_date: datetime | None = None,
    agenda: str | None = None,
    discussion_points: str | None = None,
    action_items: list[dict] | None = None,
    notes: str | None = None,
) -> dict[str, Any] | None:
    fields: list[str] = []
    values: list[Any] = []
    if meeting_date is not None:
        fields.append("meeting_date = %s")
        values.append(meeting_date)
    if agenda is not None:
        fields.append("agenda = %s")
        values.append(agenda)
    if discussion_points is not None:
        fields.append("discussion_points = %s")
        values.append(discussion_points)
    if action_items is not None:
        fields.append("action_items_json = %s")
        values.append(json.dumps(action_items))
    if notes is not None:
        fields.append("notes = %s")
        values.append(notes)
    if not fields:
        return get_meeting(conn, meeting_id)

    values.append(str(meeting_id))
    with conn.cursor() as cur:
        cur.execute(
            f"""
            UPDATE meetings
            SET {", ".join(fields)}
            WHERE id = %s
            RETURNING id, project_id, meeting_date, agenda, discussion_points,
                      action_items_json, notes, created_by, created_at
            """,
            tuple(values),
        )
        row = cur.fetchone()
    if not row:
        return None
    return _public_meeting(_row_to_meeting(row))


def get_meeting(conn: connection, meeting_id: str | UUID) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, project_id, meeting_date, agenda, discussion_points,
                   action_items_json, notes, created_by, created_at
            FROM meetings
            WHERE id = %s
            """,
            (str(meeting_id),),
        )
        row = cur.fetchone()
    if not row:
        return None
    return _row_to_meeting(row)


def list_project_meetings(conn: connection, project_id: str | UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT m.id, m.project_id, m.meeting_date, m.agenda, m.discussion_points,
                   m.action_items_json, m.notes, m.created_by, m.created_at,
                   u.full_name
            FROM meetings m
            JOIN users u ON u.id = m.created_by
            WHERE m.project_id = %s
            ORDER BY m.meeting_date DESC
            """,
            (str(project_id),),
        )
        rows = cur.fetchall()
    result = []
    for row in rows:
        meeting = _public_meeting(_row_to_meeting(row[:9]))
        meeting["created_by_name"] = row[9]
        meeting["attendee_count"] = len(get_meeting_attendance(conn, meeting["id"]))
        result.append(meeting)
    return result


def set_meeting_attendance(
    conn: connection,
    meeting_id: str | UUID,
    attendee_ids: list[str | UUID],
    project_id: str | UUID,
) -> None:
    members = _get_project_member_ids(conn, project_id)
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM meeting_attendance WHERE meeting_id = %s",
            (str(meeting_id),),
        )
        for member_id in members:
            attended = str(member_id) in {str(aid) for aid in attendee_ids}
            cur.execute(
                """
                INSERT INTO meeting_attendance (meeting_id, user_id, attended)
                VALUES (%s, %s, %s)
                """,
                (str(meeting_id), str(member_id), attended),
            )


def get_meeting_attendance(conn: connection, meeting_id: str | UUID) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT user_id FROM meeting_attendance
            WHERE meeting_id = %s AND attended = TRUE
            """,
            (str(meeting_id),),
        )
        return [str(row[0]) for row in cur.fetchall()]


def get_member_attendance_rate(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
) -> float:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                COUNT(*) AS total_meetings,
                COUNT(*) FILTER (
                    WHERE ma.attended = TRUE
                ) AS attended_meetings
            FROM meetings m
            LEFT JOIN meeting_attendance ma
                ON ma.meeting_id = m.id AND ma.user_id = %s
            WHERE m.project_id = %s
            """,
            (str(user_id), str(project_id)),
        )
        row = cur.fetchone()
    total = row[0] or 0
    attended = row[1] or 0
    if total == 0:
        return 0.0
    return round((attended / total) * 100, 1)


def _get_project_member_ids(conn: connection, project_id: str | UUID) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT user_id FROM project_members WHERE project_id = %s",
            (str(project_id),),
        )
        return [str(row[0]) for row in cur.fetchall()]


def _row_to_meeting(row: tuple) -> dict[str, Any]:
    action_items = row[5]
    if isinstance(action_items, str):
        action_items = json.loads(action_items)
    return {
        "id": row[0],
        "project_id": row[1],
        "meeting_date": row[2],
        "agenda": row[3],
        "discussion_points": row[4],
        "action_items": action_items,
        "notes": row[6],
        "created_by": row[7],
        "created_at": row[8],
    }


def _public_meeting(meeting: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(meeting["id"]),
        "project_id": str(meeting["project_id"]),
        "meeting_date": meeting["meeting_date"].isoformat(),
        "agenda": meeting["agenda"],
        "discussion_points": meeting["discussion_points"],
        "action_items": meeting["action_items"],
        "notes": meeting["notes"],
        "created_by": str(meeting["created_by"]),
        "created_at": meeting["created_at"].isoformat(),
    }
