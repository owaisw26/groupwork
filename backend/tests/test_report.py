import pytest

from tests.task_helpers import add_project_member, create_project, create_task, switch_user, verified_user


@pytest.fixture(autouse=True)
def clear_report_rate_limit():
    _clear_rate_limit()
    yield
    _clear_rate_limit()


def _clear_rate_limit() -> None:
    from app.middleware.rate_limit import limiter

    if hasattr(limiter, "_storage") and hasattr(limiter._storage, "storage"):
        limiter._storage.storage.clear()


def _set_project_status(db_conn, project_id: str, status: str) -> None:
    with db_conn.cursor() as cur:
        if status == "archived":
            cur.execute(
                """
                UPDATE projects
                SET status = %s, archived_at = NOW()
                WHERE id = %s
                """,
                (status, project_id),
            )
        else:
            cur.execute(
                "UPDATE projects SET status = %s WHERE id = %s",
                (status, project_id),
            )
    db_conn.commit()


def _seed_report_data(auth_client, email_outbox, db_conn):
    owner_headers, owner_email = verified_user(auth_client, email_outbox, email="report-owner@example.com")
    project = create_project(auth_client, owner_headers, name="Report Project").json()
    task_done = create_task(
        auth_client,
        owner_headers,
        project["id"],
        title="Done Task",
        status="done",
        priority="high",
    ).json()
    task_progress = create_task(
        auth_client,
        owner_headers,
        project["id"],
        title="In Progress Task",
        status="in_progress",
        priority="medium",
    ).json()

    member_headers, member_email = verified_user(
        auth_client, email_outbox, email="report-member@example.com"
    )
    member_id = add_project_member(db_conn, project["id"], member_email)

    outsider_headers, _ = verified_user(auth_client, email_outbox, email="report-outsider@example.com")

    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (owner_email,))
        owner_id = cur.fetchone()[0]

        cur.execute(
            "INSERT INTO task_assignees (task_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (task_done["id"], owner_id),
        )
        cur.execute(
            "INSERT INTO task_assignees (task_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (task_progress["id"], member_id),
        )

        cur.execute(
            """
            INSERT INTO time_logs (task_id, user_id, hours, date, description)
            VALUES
                (%s, %s, 2.5, CURRENT_DATE, 'Implemented feature'),
                (%s, %s, 1.5, CURRENT_DATE, 'Peer support')
            """,
            (task_done["id"], owner_id, task_progress["id"], member_id),
        )

        cur.execute(
            """
            INSERT INTO peer_reviews (
                project_id, reviewer_id, reviewee_id,
                contribution_quality, communication, reliability, overall, comment
            )
            VALUES
                (%s, %s, %s, 5, 4, 5, 5, 'Strong contribution'),
                (%s, %s, %s, 4, 5, 4, 4, 'Reliable teammate')
            """,
            (project["id"], owner_id, member_id, project["id"], member_id, owner_id),
        )

        cur.execute(
            """
            INSERT INTO disputes (task_id, filed_by, reason, status, outcome, resolved_at)
            VALUES
                (%s, %s, 'Ownership clarification', 'open', NULL, NULL),
                (%s, %s, 'Scope disagreement', 'resolved', 'accepted', NOW())
            """,
            (task_progress["id"], owner_id, task_done["id"], member_id),
        )

        cur.execute(
            """
            INSERT INTO meetings (project_id, meeting_date, agenda, discussion_points, action_items_json, notes, created_by)
            VALUES
                (%s, NOW() - INTERVAL '2 days', 'Sprint sync', 'Updates', '[]', 'All good', %s),
                (%s, NOW() - INTERVAL '1 day', 'Wrap up', 'Final checks', '[]', 'Done', %s)
            RETURNING id
            """,
            (project["id"], owner_id, project["id"], owner_id),
        )
        meeting_ids = [row[0] for row in cur.fetchall()]

        for meeting_id in meeting_ids:
            cur.execute(
                """
                INSERT INTO meeting_attendance (meeting_id, user_id, attended)
                VALUES
                    (%s, %s, TRUE),
                    (%s, %s, TRUE)
                """,
                (meeting_id, owner_id, meeting_id, member_id),
            )

    db_conn.commit()
    return {
        "project_id": project["id"],
        "owner_email": owner_email,
        "member_email": member_email,
        "outsider_email": "report-outsider@example.com",
    }


def _owner_headers(auth_client, ctx):
    _clear_rate_limit()
    return switch_user(auth_client, ctx["owner_email"])


def _member_headers(auth_client, ctx):
    _clear_rate_limit()
    return switch_user(auth_client, ctx["member_email"])


def _outsider_headers(auth_client, ctx):
    _clear_rate_limit()
    return switch_user(auth_client, ctx["outsider_email"])


def test_report_preview_returns_aggregated_data(auth_client, email_outbox, db_conn):
    ctx = _seed_report_data(auth_client, email_outbox, db_conn)
    _set_project_status(db_conn, ctx["project_id"], "report_generated")

    response = auth_client.get(
        f"/api/v1/projects/{ctx['project_id']}/report/preview",
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["project"]["status"] == "report_generated"
    assert data["task_summary"]["total_tasks"] == 2
    assert data["task_summary"]["completed_tasks"] == 1
    assert data["time_logs"]["total_hours"] == 4.0
    assert len(data["peer_scores"]["items"]) == 2
    assert data["disputes"]["total"] == 2
    assert data["attendance"]["total_meetings"] == 2


def test_report_preview_non_member_returns_403(auth_client, email_outbox, db_conn):
    ctx = _seed_report_data(auth_client, email_outbox, db_conn)
    _set_project_status(db_conn, ctx["project_id"], "report_generated")

    response = auth_client.get(
        f"/api/v1/projects/{ctx['project_id']}/report/preview",
        headers=_outsider_headers(auth_client, ctx),
    )

    assert response.status_code == 403


def test_report_preview_requires_report_generated_or_archived(auth_client, email_outbox, db_conn):
    ctx = _seed_report_data(auth_client, email_outbox, db_conn)

    response = auth_client.get(
        f"/api/v1/projects/{ctx['project_id']}/report/preview",
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 400


def test_report_preview_allows_archived_state(auth_client, email_outbox, db_conn):
    ctx = _seed_report_data(auth_client, email_outbox, db_conn)
    _set_project_status(db_conn, ctx["project_id"], "archived")

    response = auth_client.get(
        f"/api/v1/projects/{ctx['project_id']}/report/preview",
        headers=_member_headers(auth_client, ctx),
    )

    assert response.status_code == 200
    assert response.json()["project"]["status"] == "archived"


def test_report_pdf_generation_is_mocked(auth_client, email_outbox, db_conn, monkeypatch):
    ctx = _seed_report_data(auth_client, email_outbox, db_conn)
    _set_project_status(db_conn, ctx["project_id"], "report_generated")
    captured_html = {"value": ""}

    def fake_pdf_renderer(html: str, *, base_url: str | None = None) -> bytes:
        captured_html["value"] = html
        return b"%PDF-1.4 mock"

    monkeypatch.setattr("app.services.report.render_html_to_pdf_bytes", fake_pdf_renderer)

    response = auth_client.get(
        f"/api/v1/projects/{ctx['project_id']}/report",
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-1.4")
    assert "Contribution Report" in captured_html["value"]
    assert "Peer Scores" in captured_html["value"]


def test_report_pdf_non_member_returns_403(auth_client, email_outbox, db_conn, monkeypatch):
    ctx = _seed_report_data(auth_client, email_outbox, db_conn)
    _set_project_status(db_conn, ctx["project_id"], "report_generated")
    monkeypatch.setattr(
        "app.services.report.render_html_to_pdf_bytes",
        lambda *_args, **_kwargs: b"%PDF-1.4 mock",
    )

    response = auth_client.get(
        f"/api/v1/projects/{ctx['project_id']}/report",
        headers=_outsider_headers(auth_client, ctx),
    )

    assert response.status_code == 403


def test_report_pdf_requires_report_generated_or_archived(
    auth_client, email_outbox, db_conn, monkeypatch
):
    ctx = _seed_report_data(auth_client, email_outbox, db_conn)
    monkeypatch.setattr(
        "app.services.report.render_html_to_pdf_bytes",
        lambda *_args, **_kwargs: b"%PDF-1.4 mock",
    )

    response = auth_client.get(
        f"/api/v1/projects/{ctx['project_id']}/report",
        headers=_owner_headers(auth_client, ctx),
    )

    assert response.status_code == 400


def test_report_pdf_rate_limited_to_two_per_hour(auth_client, email_outbox, db_conn, monkeypatch):
    ctx = _seed_report_data(auth_client, email_outbox, db_conn)
    _set_project_status(db_conn, ctx["project_id"], "report_generated")
    monkeypatch.setattr(
        "app.services.report.render_html_to_pdf_bytes",
        lambda *_args, **_kwargs: b"%PDF-1.4 mock",
    )

    headers = switch_user(auth_client, ctx["owner_email"])
    first = auth_client.get(
        f"/api/v1/projects/{ctx['project_id']}/report",
        headers=headers,
    )
    second = auth_client.get(
        f"/api/v1/projects/{ctx['project_id']}/report",
        headers=headers,
    )
    third = auth_client.get(
        f"/api/v1/projects/{ctx['project_id']}/report",
        headers=headers,
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert third.status_code == 429
