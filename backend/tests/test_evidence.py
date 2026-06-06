import pytest

from tests.task_helpers import add_project_member, create_project, create_task, verified_user

ALLOWED_FILE = {
    "filename": "report.pdf",
    "content_type": "application/pdf",
    "file_size": 1024,
}

DISALLOWED_EXE = {
    "filename": "malware.exe",
    "content_type": "application/octet-stream",
    "file_size": 1024,
}

DISALLOWED_SH = {
    "filename": "script.sh",
    "content_type": "application/x-sh",
    "file_size": 512,
}

OVERSIZED_FILE = {
    "filename": "huge.pdf",
    "content_type": "application/pdf",
    "file_size": 6 * 1024 * 1024,
}

SQL_FILENAME = {
    "filename": "'; DROP TABLE evidence_files; --.pdf",
    "content_type": "application/pdf",
    "file_size": 2048,
}


@pytest.fixture
def mock_s3(monkeypatch):
    generated_urls: list[dict] = []

    def fake_presigned_upload(bucket, key, content_type, max_size):
        url = f"https://{bucket}.s3.amazonaws.com/{key}?presigned=true"
        generated_urls.append(
            {"bucket": bucket, "key": key, "content_type": content_type, "max_size": max_size}
        )
        return url

    def fake_presigned_download(bucket, key, expires_in=900):
        return f"https://{bucket}.s3.amazonaws.com/{key}?download=true"

    monkeypatch.setattr(
        "app.utils.s3.generate_presigned_upload_url",
        fake_presigned_upload,
    )
    monkeypatch.setattr(
        "app.utils.s3.generate_presigned_download_url",
        fake_presigned_download,
    )
    return generated_urls


def _request_upload(client, headers, task_id, payload):
    return client.post(
        f"/api/v1/tasks/{task_id}/evidence",
        json=payload,
        headers=headers,
    )


def _confirm_upload(client, headers, task_id, evidence_id):
    return client.post(
        f"/api/v1/tasks/{task_id}/evidence/confirm",
        json={"evidence_id": evidence_id},
        headers=headers,
    )


def test_request_presigned_url_valid_returns_upload_url(auth_client, email_outbox, mock_s3):
    headers, _ = verified_user(auth_client, email_outbox, email="evidence-valid@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    response = _request_upload(auth_client, headers, task["id"], ALLOWED_FILE)

    assert response.status_code == 201
    data = response.json()
    assert "upload_url" in data
    assert "evidence_id" in data
    assert "s3_key" in data
    assert data["upload_url"].startswith("https://")
    assert f"projects/{project['id']}/evidence/" in data["s3_key"]
    assert len(mock_s3) == 1
    assert mock_s3[0]["content_type"] == "application/pdf"


def test_request_presigned_url_rejects_exe(auth_client, email_outbox, mock_s3):
    headers, _ = verified_user(auth_client, email_outbox, email="evidence-exe@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    response = _request_upload(auth_client, headers, task["id"], DISALLOWED_EXE)

    assert response.status_code == 422
    assert len(mock_s3) == 0


def test_request_presigned_url_rejects_sh(auth_client, email_outbox, mock_s3):
    headers, _ = verified_user(auth_client, email_outbox, email="evidence-sh@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    response = _request_upload(auth_client, headers, task["id"], DISALLOWED_SH)

    assert response.status_code == 422
    assert len(mock_s3) == 0


def test_request_presigned_url_rejects_oversized_file(auth_client, email_outbox, mock_s3):
    headers, _ = verified_user(auth_client, email_outbox, email="evidence-big@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    response = _request_upload(auth_client, headers, task["id"], OVERSIZED_FILE)

    assert response.status_code == 422
    assert len(mock_s3) == 0


def test_request_presigned_url_rejects_project_quota_exceeded(
    auth_client, email_outbox, db_conn, mock_s3
):
    headers, _ = verified_user(auth_client, email_outbox, email="evidence-quota@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    with db_conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO evidence_files (
                task_id, user_id, s3_key, original_filename, file_size, mime_type
            )
            SELECT %s, u.id, 'projects/test/key', 'existing.pdf', 49 * 1024 * 1024, 'application/pdf'
            FROM users u WHERE u.email = %s
            """,
            (task["id"], "evidence-quota@example.com"),
        )
    db_conn.commit()

    response = _request_upload(
        auth_client,
        headers,
        task["id"],
        {
            "filename": "one-more.pdf",
            "content_type": "application/pdf",
            "file_size": 2 * 1024 * 1024,
        },
    )

    assert response.status_code == 400
    assert len(mock_s3) == 0


def test_request_presigned_url_non_member_returns_403(auth_client, email_outbox, mock_s3):
    owner_headers, _ = verified_user(
        auth_client, email_outbox, email="evidence-owner@example.com"
    )
    project = create_project(auth_client, owner_headers).json()
    task = create_task(auth_client, owner_headers, project["id"]).json()

    outsider_headers, _ = verified_user(
        auth_client, email_outbox, email="evidence-outsider@example.com"
    )
    response = _request_upload(auth_client, outsider_headers, task["id"], ALLOWED_FILE)

    assert response.status_code == 403
    assert len(mock_s3) == 0


def test_confirm_upload_stores_metadata(auth_client, email_outbox, mock_s3):
    headers, _ = verified_user(auth_client, email_outbox, email="evidence-confirm@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    upload = _request_upload(auth_client, headers, task["id"], ALLOWED_FILE).json()
    response = _confirm_upload(auth_client, headers, task["id"], upload["evidence_id"])

    assert response.status_code == 200
    data = response.json()
    assert data["original_filename"] == "report.pdf"
    assert data["file_size"] == 1024
    assert data["mime_type"] == "application/pdf"
    assert data["task_id"] == task["id"]


def test_evidence_metadata_is_immutable(auth_client, email_outbox, mock_s3):
    headers, _ = verified_user(auth_client, email_outbox, email="evidence-immutable@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    upload = _request_upload(auth_client, headers, task["id"], ALLOWED_FILE).json()
    confirmed = _confirm_upload(auth_client, headers, task["id"], upload["evidence_id"]).json()

    put_response = auth_client.put(
        f"/api/v1/tasks/{task['id']}/evidence/{confirmed['id']}",
        json={"original_filename": "changed.pdf"},
        headers=headers,
    )
    delete_response = auth_client.delete(
        f"/api/v1/tasks/{task['id']}/evidence/{confirmed['id']}",
        headers=headers,
    )

    assert put_response.status_code == 404
    assert delete_response.status_code == 404


def test_list_task_evidence(auth_client, email_outbox, mock_s3):
    headers, _ = verified_user(auth_client, email_outbox, email="evidence-list-task@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    upload = _request_upload(auth_client, headers, task["id"], ALLOWED_FILE).json()
    _confirm_upload(auth_client, headers, task["id"], upload["evidence_id"])

    response = auth_client.get(f"/api/v1/tasks/{task['id']}/evidence", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["original_filename"] == "report.pdf"
    assert "download_url" in data["items"][0]


def test_list_project_evidence(auth_client, email_outbox, mock_s3):
    headers, _ = verified_user(
        auth_client, email_outbox, email="evidence-list-project@example.com"
    )
    project = create_project(auth_client, headers).json()
    task_one = create_task(auth_client, headers, project["id"], title="Task A").json()
    task_two = create_task(auth_client, headers, project["id"], title="Task B").json()

    for task, filename in [(task_one, "a.pdf"), (task_two, "b.png")]:
        upload = _request_upload(
            auth_client,
            headers,
            task["id"],
            {
                "filename": filename,
                "content_type": "application/pdf" if filename.endswith(".pdf") else "image/png",
                "file_size": 500,
            },
        ).json()
        _confirm_upload(auth_client, headers, task["id"], upload["evidence_id"])

    response = auth_client.get(f"/api/v1/projects/{project['id']}/evidence", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    filenames = {item["original_filename"] for item in data["items"]}
    assert filenames == {"a.pdf", "b.png"}


def test_sql_injection_filename_stored_safely(auth_client, email_outbox, mock_s3, db_conn):
    headers, _ = verified_user(auth_client, email_outbox, email="evidence-sql@example.com")
    project = create_project(auth_client, headers).json()
    task = create_task(auth_client, headers, project["id"]).json()

    upload = _request_upload(auth_client, headers, task["id"], SQL_FILENAME).json()
    confirmed = _confirm_upload(auth_client, headers, task["id"], upload["evidence_id"])

    assert confirmed.status_code == 200
    assert confirmed.json()["original_filename"] == SQL_FILENAME["filename"]

    with db_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM evidence_files")
        count = cur.fetchone()[0]
    assert count == 1
