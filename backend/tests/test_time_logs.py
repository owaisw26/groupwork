from datetime import date, timedelta

from tests.task_helpers import add_project_member, create_project, create_task, verified_user


def test_log_time_valid_returns_201(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="timelog-create@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/time-logs",
        json={"hours": 2.5, "date": str(date.today()), "description": "Coding"},
        headers=headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["hours"] == 2.5
    assert data["description"] == "Coding"


def test_log_time_non_assignee_returns_403(auth_client, email_outbox, db_conn):
    owner_headers, _ = verified_user(
        auth_client, email_outbox, email="timelog-owner@example.com"
    )
    project = create_project(auth_client, owner_headers).json()
    task = create_task(auth_client, owner_headers, project["id"]).json()

    member_headers, member_email = verified_user(
        auth_client, email_outbox, email="timelog-member@example.com"
    )
    add_project_member(db_conn, project["id"], member_email)

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/time-logs",
        json={"hours": 1.0, "date": str(date.today())},
        headers=member_headers,
    )

    assert response.status_code == 403


def test_log_time_negative_hours_returns_422(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="timelog-negative@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/time-logs",
        json={"hours": -1, "date": str(date.today())},
        headers=headers,
    )

    assert response.status_code == 422


def test_log_time_future_date_returns_422(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="timelog-future@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()
    future = date.today() + timedelta(days=1)

    response = auth_client.post(
        f"/api/v1/tasks/{task['id']}/time-logs",
        json={"hours": 1.0, "date": str(future)},
        headers=headers,
    )

    assert response.status_code == 422


def test_list_time_logs_returns_entries(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="timelog-list@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    auth_client.post(
        f"/api/v1/tasks/{task['id']}/time-logs",
        json={"hours": 1.5, "date": str(date.today())},
        headers=headers,
    )
    auth_client.post(
        f"/api/v1/tasks/{task['id']}/time-logs",
        json={"hours": 2.0, "date": str(date.today())},
        headers=headers,
    )

    response = auth_client.get(f"/api/v1/tasks/{task['id']}/time-logs", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total_hours_for_user_in_project"] == 3.5


def test_time_logs_append_only_no_put_or_delete(auth_client, email_outbox):
    headers, _ = verified_user(auth_client, email_outbox, email="timelog-append@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()
    entry = auth_client.post(
        f"/api/v1/tasks/{task['id']}/time-logs",
        json={"hours": 1.0, "date": str(date.today())},
        headers=headers,
    ).json()

    put_response = auth_client.put(
        f"/api/v1/tasks/{task['id']}/time-logs/{entry['id']}",
        json={"hours": 99},
        headers=headers,
    )
    delete_response = auth_client.delete(
        f"/api/v1/tasks/{task['id']}/time-logs/{entry['id']}",
        headers=headers,
    )

    assert put_response.status_code == 404
    assert delete_response.status_code == 404


def test_total_hours_aggregation_per_user_per_project(auth_client, email_outbox, db_conn):
    headers, email = verified_user(
        auth_client, email_outbox, email="timelog-total@example.com"
    )
    project = create_project(auth_client, headers).json()
    task_one = create_task(auth_client, headers, project["id"], title="Task one").json()
    task_two = create_task(auth_client, headers, project["id"], title="Task two").json()

    auth_client.post(
        f"/api/v1/tasks/{task_one['id']}/time-logs",
        json={"hours": 1.25, "date": str(date.today())},
        headers=headers,
    )
    auth_client.post(
        f"/api/v1/tasks/{task_two['id']}/time-logs",
        json={"hours": 2.75, "date": str(date.today())},
        headers=headers,
    )

    from app.db.queries.time_logs import get_user_project_hours

    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        user_id = cur.fetchone()[0]
    total = get_user_project_hours(db_conn, project["id"], user_id)
    assert float(total) == 4.0
