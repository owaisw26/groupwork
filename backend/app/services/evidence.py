import os
import re
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from psycopg2.extensions import connection

from app.config import get_settings
from app.db.queries import evidence as evidence_queries
from app.db.queries import projects as project_queries
from app.db.queries import tasks as task_queries
from app.utils.s3 import (
    generate_presigned_download_url,
    generate_presigned_upload_url,
    get_object_metadata,
    object_exists,
)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".docx", ".xlsx", ".txt", ".zip"}

ALLOWED_MIME_TYPES = {
    ".pdf": {"application/pdf"},
    ".png": {"image/png"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    ".xlsx": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    ".txt": {"text/plain"},
    ".zip": {"application/zip", "application/x-zip-compressed"},
}


def _require_task_access(conn: connection, task_id: str | UUID, user_id: str | UUID) -> dict:
    task = task_queries.get_task(conn, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    project = project_queries.get_project(conn, task["project_id"])
    if not project or project["deleted_at"] is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not project_queries.is_project_member(conn, task["project_id"], user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")
    return task


def _require_project_member(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
) -> dict:
    project = project_queries.get_project(conn, project_id)
    if not project or project["deleted_at"] is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if not project_queries.is_project_member(conn, project_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")
    return project


def _sanitize_filename(filename: str) -> str:
    safe_name = os.path.basename(filename.strip())
    safe_name = re.sub(r"[^\w.\- ]", "_", safe_name)
    if not safe_name or safe_name in {".", ".."}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid filename",
        )
    return safe_name


def _validate_file(filename: str, content_type: str, file_size: int) -> str:
    safe_filename = _sanitize_filename(filename)
    extension = os.path.splitext(safe_filename)[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File type not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    allowed_mimes = ALLOWED_MIME_TYPES.get(extension, set())
    if content_type not in allowed_mimes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Content type does not match file extension",
        )
    if file_size > evidence_queries.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File exceeds maximum size of 5MB",
        )
    return safe_filename


def _build_s3_key(project_id: str | UUID, evidence_id: str | UUID, filename: str) -> str:
    safe_filename = _sanitize_filename(filename)
    return f"projects/{project_id}/evidence/{evidence_id}/{safe_filename}"


def _check_project_quota(conn: connection, project_id: str | UUID, file_size: int) -> None:
    current_size = evidence_queries.get_project_total_size(conn, project_id)
    if current_size + file_size > evidence_queries.MAX_PROJECT_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project evidence storage quota exceeded (50MB limit)",
        )


def request_upload(
    conn: connection,
    task_id: str | UUID,
    user_id: str | UUID,
    *,
    filename: str,
    content_type: str,
    file_size: int,
) -> dict:
    task = _require_task_access(conn, task_id, user_id)
    safe_filename = _validate_file(filename, content_type, file_size)
    _check_project_quota(conn, task["project_id"], file_size)

    settings = get_settings()
    if not settings.AWS_S3_BUCKET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage is not configured",
        )

    evidence_id = uuid4()
    s3_key = _build_s3_key(task["project_id"], evidence_id, safe_filename)
    upload_url = generate_presigned_upload_url(
        settings.AWS_S3_BUCKET,
        s3_key,
        content_type,
        file_size,
    )

    return {
        "evidence_id": str(evidence_id),
        "s3_key": s3_key,
        "upload_url": upload_url,
        "content_type": content_type,
        "file_size": file_size,
        "filename": safe_filename,
    }


def confirm_upload(
    conn: connection,
    task_id: str | UUID,
    user_id: str | UUID,
    *,
    evidence_id: str | UUID,
    filename: str,
    content_type: str,
    file_size: int,
) -> dict:
    task = _require_task_access(conn, task_id, user_id)
    safe_filename = _validate_file(filename, content_type, file_size)
    _check_project_quota(conn, task["project_id"], file_size)

    settings = get_settings()
    if not settings.AWS_S3_BUCKET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage is not configured",
        )

    s3_key = _build_s3_key(task["project_id"], evidence_id, safe_filename)
    if not object_exists(settings.AWS_S3_BUCKET, s3_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File not found in storage. Upload to S3 before confirming.",
        )

    metadata = get_object_metadata(settings.AWS_S3_BUCKET, s3_key)
    actual_size = metadata.get("ContentLength", 0)
    if actual_size > evidence_queries.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file exceeds maximum size of 5MB",
        )
    if actual_size > file_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is larger than declared size",
        )

    existing = evidence_queries.get_evidence_by_s3_key(conn, s3_key)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Evidence already confirmed",
        )

    return evidence_queries.create_evidence_record(
        conn,
        task_id=task_id,
        user_id=user_id,
        s3_key=s3_key,
        original_filename=safe_filename,
        file_size=actual_size,
        mime_type=content_type,
        evidence_id=evidence_id,
    )


def list_task_evidence(
    conn: connection,
    task_id: str | UUID,
    user_id: str | UUID,
) -> dict:
    _require_task_access(conn, task_id, user_id)
    settings = get_settings()
    raw_items = evidence_queries.list_task_evidence(conn, task_id)
    items = []
    for raw in raw_items:
        public = evidence_queries._public_evidence(raw)
        if settings.AWS_S3_BUCKET:
            public["download_url"] = generate_presigned_download_url(
                settings.AWS_S3_BUCKET,
                raw["s3_key"],
            )
        items.append(public)
    return {"items": items}


def list_project_evidence(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
) -> dict:
    _require_project_member(conn, project_id, user_id)
    settings = get_settings()
    raw_items = evidence_queries.list_project_evidence(conn, project_id)
    items = []
    for raw in raw_items:
        public = evidence_queries._public_evidence(raw)
        public["task_title"] = raw.get("task_title")
        if settings.AWS_S3_BUCKET:
            public["download_url"] = generate_presigned_download_url(
                settings.AWS_S3_BUCKET,
                raw["s3_key"],
            )
        items.append(public)
    return {"items": items}
