from __future__ import annotations

from datetime import datetime, timezone
from html import escape
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from psycopg2.extensions import connection

from app.db.queries import projects as project_queries
from app.utils.pdf import render_html_to_pdf_bytes

ALLOWED_REPORT_STATUSES = {"report_generated", "archived"}
TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "utils" / "report_template.html"


def _require_report_access(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
) -> dict[str, Any]:
    project = project_queries.get_project(conn, project_id)
    if not project or project["deleted_at"] is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if not project_queries.is_project_member(conn, project_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")
    if project["status"] not in ALLOWED_REPORT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report is only available for report-generated or archived projects",
        )
    return project


def generate_report_data(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
) -> dict[str, Any]:
    project = _require_report_access(conn, project_id, user_id)
    members = project_queries.get_project_members(conn, project_id)
    members_by_id = {str(member["id"]): member for member in members}

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT status, COUNT(*)::int
            FROM tasks
            WHERE project_id = %s
            GROUP BY status
            """,
            (str(project_id),),
        )
        task_status_rows = cur.fetchall()

        cur.execute(
            """
            SELECT COUNT(*)::int
            FROM tasks
            WHERE project_id = %s
            """,
            (str(project_id),),
        )
        total_tasks = cur.fetchone()[0]

        cur.execute(
            """
            SELECT COUNT(*)::int
            FROM tasks
            WHERE project_id = %s AND status = 'done'
            """,
            (str(project_id),),
        )
        completed_tasks = cur.fetchone()[0]

        cur.execute(
            """
            SELECT
                t.id,
                t.title,
                t.status,
                t.priority,
                t.due_date,
                t.verification_status,
                COALESCE(string_agg(u.full_name, ', ' ORDER BY u.full_name), '') AS assignees
            FROM tasks t
            LEFT JOIN task_assignees ta ON ta.task_id = t.id
            LEFT JOIN users u ON u.id = ta.user_id
            WHERE t.project_id = %s
            GROUP BY t.id, t.title, t.status, t.priority, t.due_date, t.verification_status
            ORDER BY t.created_at ASC
            """,
            (str(project_id),),
        )
        task_rows = cur.fetchall()

        cur.execute(
            """
            SELECT
                tl.user_id,
                u.full_name,
                COALESCE(SUM(tl.hours), 0) AS total_hours
            FROM time_logs tl
            JOIN tasks t ON t.id = tl.task_id
            JOIN users u ON u.id = tl.user_id
            WHERE t.project_id = %s
            GROUP BY tl.user_id, u.full_name
            ORDER BY u.full_name ASC
            """,
            (str(project_id),),
        )
        time_rows = cur.fetchall()

        cur.execute(
            """
            SELECT
                pr.reviewee_id,
                u.full_name,
                ROUND(AVG(pr.contribution_quality)::numeric, 2) AS avg_contribution_quality,
                ROUND(AVG(pr.communication)::numeric, 2) AS avg_communication,
                ROUND(AVG(pr.reliability)::numeric, 2) AS avg_reliability,
                ROUND(AVG(pr.overall)::numeric, 2) AS avg_overall,
                COUNT(*)::int AS review_count
            FROM peer_reviews pr
            JOIN users u ON u.id = pr.reviewee_id
            WHERE pr.project_id = %s
            GROUP BY pr.reviewee_id, u.full_name
            ORDER BY u.full_name ASC
            """,
            (str(project_id),),
        )
        peer_rows = cur.fetchall()

        cur.execute(
            """
            SELECT
                d.id,
                d.task_id,
                t.title,
                d.status,
                d.reason,
                d.outcome,
                d.created_at,
                d.resolved_at
            FROM disputes d
            JOIN tasks t ON t.id = d.task_id
            WHERE t.project_id = %s
            ORDER BY d.created_at ASC
            """,
            (str(project_id),),
        )
        dispute_rows = cur.fetchall()

        cur.execute(
            """
            SELECT COUNT(*)::int
            FROM meetings
            WHERE project_id = %s
            """,
            (str(project_id),),
        )
        total_meetings = cur.fetchone()[0]

        cur.execute(
            """
            SELECT ma.user_id, COUNT(*)::int
            FROM meeting_attendance ma
            JOIN meetings m ON m.id = ma.meeting_id
            WHERE m.project_id = %s AND ma.attended = TRUE
            GROUP BY ma.user_id
            """,
            (str(project_id),),
        )
        attendance_rows = cur.fetchall()

    task_status_summary = {row[0]: row[1] for row in task_status_rows}
    task_items = [
        {
            "id": str(row[0]),
            "title": row[1],
            "status": row[2],
            "priority": row[3],
            "due_date": row[4].isoformat() if row[4] else None,
            "verification_status": row[5],
            "assignees": row[6],
        }
        for row in task_rows
    ]

    time_by_member = [
        {
            "user_id": str(row[0]),
            "user_name": row[1],
            "hours": float(row[2]),
        }
        for row in time_rows
    ]

    peer_score_items = [
        {
            "reviewee_id": str(row[0]),
            "reviewee_name": row[1],
            "avg_contribution_quality": float(row[2]),
            "avg_communication": float(row[3]),
            "avg_reliability": float(row[4]),
            "avg_overall": float(row[5]),
            "review_count": row[6],
        }
        for row in peer_rows
    ]

    disputes = [
        {
            "id": str(row[0]),
            "task_id": str(row[1]),
            "task_title": row[2],
            "status": row[3],
            "reason": row[4],
            "outcome": row[5],
            "created_at": row[6].isoformat(),
            "resolved_at": row[7].isoformat() if row[7] else None,
        }
        for row in dispute_rows
    ]

    attended_counts = {str(row[0]): row[1] for row in attendance_rows}
    attendance_items = []
    for member in members:
        member_id = str(member["id"])
        attended = attended_counts.get(member_id, 0)
        attendance_rate = round((attended / total_meetings) * 100, 1) if total_meetings else 0.0
        attendance_items.append(
            {
                "user_id": member_id,
                "user_name": member["full_name"],
                "attended_meetings": attended,
                "total_meetings": total_meetings,
                "attendance_rate": attendance_rate,
            }
        )

    return {
        "project": {
            "id": str(project["id"]),
            "name": project["name"],
            "course": project["course"],
            "status": project["status"],
            "due_date": project["due_date"].isoformat() if project["due_date"] else None,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "task_summary": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "by_status": task_status_summary,
            "items": task_items,
        },
        "time_logs": {
            "total_hours": round(sum(item["hours"] for item in time_by_member), 2),
            "by_member": time_by_member,
        },
        "peer_scores": {
            "items": peer_score_items,
        },
        "disputes": {
            "total": len(disputes),
            "open": len([item for item in disputes if item["status"] == "open"]),
            "resolved": len([item for item in disputes if item["status"] == "resolved"]),
            "items": disputes,
        },
        "attendance": {
            "total_meetings": total_meetings,
            "by_member": attendance_items,
        },
        "member_count": len(members_by_id),
    }


def generate_pdf(conn: connection, project_id: str | UUID, user_id: str | UUID) -> bytes:
    report_data = generate_report_data(conn, project_id, user_id)
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    html = _render_html(template, report_data)
    return render_html_to_pdf_bytes(html, base_url=str(TEMPLATE_PATH.parent))


def _render_html(template: str, report: dict[str, Any]) -> str:
    task_rows = "".join(
        (
            "<tr>"
            f"<td>{escape(item['title'])}</td>"
            f"<td>{escape(item['status'])}</td>"
            f"<td>{escape(item['priority'])}</td>"
            f"<td>{escape(item['assignees'] or '-')}</td>"
            "</tr>"
        )
        for item in report["task_summary"]["items"]
    ) or "<tr><td colspan='4'>No tasks found</td></tr>"

    time_rows = "".join(
        (
            "<tr>"
            f"<td>{escape(item['user_name'])}</td>"
            f"<td>{item['hours']:.2f}</td>"
            "</tr>"
        )
        for item in report["time_logs"]["by_member"]
    ) or "<tr><td colspan='2'>No time logs found</td></tr>"

    peer_rows = "".join(
        (
            "<tr>"
            f"<td>{escape(item['reviewee_name'])}</td>"
            f"<td>{item['avg_contribution_quality']:.2f}</td>"
            f"<td>{item['avg_communication']:.2f}</td>"
            f"<td>{item['avg_reliability']:.2f}</td>"
            f"<td>{item['avg_overall']:.2f}</td>"
            f"<td>{item['review_count']}</td>"
            "</tr>"
        )
        for item in report["peer_scores"]["items"]
    ) or "<tr><td colspan='6'>No peer reviews found</td></tr>"

    dispute_rows = "".join(
        (
            "<tr>"
            f"<td>{escape(item['task_title'])}</td>"
            f"<td>{escape(item['status'])}</td>"
            f"<td>{escape(item['reason'])}</td>"
            f"<td>{escape(item['outcome'] or '-')}</td>"
            "</tr>"
        )
        for item in report["disputes"]["items"]
    ) or "<tr><td colspan='4'>No disputes found</td></tr>"

    attendance_rows = "".join(
        (
            "<tr>"
            f"<td>{escape(item['user_name'])}</td>"
            f"<td>{item['attended_meetings']}/{item['total_meetings']}</td>"
            f"<td>{item['attendance_rate']:.1f}%</td>"
            "</tr>"
        )
        for item in report["attendance"]["by_member"]
    ) or "<tr><td colspan='3'>No attendance data found</td></tr>"

    replacements = {
        "{{project_name}}": escape(report["project"]["name"]),
        "{{project_course}}": escape(report["project"]["course"] or "-"),
        "{{generated_at}}": escape(report["generated_at"]),
        "{{total_tasks}}": str(report["task_summary"]["total_tasks"]),
        "{{completed_tasks}}": str(report["task_summary"]["completed_tasks"]),
        "{{total_hours}}": f"{report['time_logs']['total_hours']:.2f}",
        "{{dispute_total}}": str(report["disputes"]["total"]),
        "{{attendance_total_meetings}}": str(report["attendance"]["total_meetings"]),
        "{{task_rows}}": task_rows,
        "{{time_rows}}": time_rows,
        "{{peer_rows}}": peer_rows,
        "{{dispute_rows}}": dispute_rows,
        "{{attendance_rows}}": attendance_rows,
    }

    html = template
    for key, value in replacements.items():
        html = html.replace(key, value)
    return html
