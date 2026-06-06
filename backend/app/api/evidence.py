from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from psycopg2.extensions import connection

from app.db.connection import get_connection
from app.middleware.auth import get_verified_user
from app.middleware.rate_limit import FILE_UPLOAD_RATE_LIMIT, limiter
from app.models.evidence import ConfirmEvidenceUploadBody, RequestEvidenceUploadBody
from app.services import evidence as evidence_service

router = APIRouter(tags=["evidence"])


def _get_db() -> connection:
    with get_connection() as conn:
        yield conn


@router.post("/tasks/{task_id}/evidence", status_code=status.HTTP_201_CREATED)
@limiter.limit(FILE_UPLOAD_RATE_LIMIT)
def request_evidence_upload(
    task_id: UUID,
    request: Request,
    body: RequestEvidenceUploadBody,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return evidence_service.request_upload(
        conn,
        task_id,
        user["id"],
        filename=body.filename,
        content_type=body.content_type,
        file_size=body.file_size,
    )


@router.post("/tasks/{task_id}/evidence/confirm")
def confirm_evidence_upload(
    task_id: UUID,
    request: Request,
    body: ConfirmEvidenceUploadBody,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return evidence_service.confirm_upload(
        conn,
        task_id,
        user["id"],
        evidence_id=body.evidence_id,
        filename=body.filename,
        content_type=body.content_type,
        file_size=body.file_size,
    )


@router.get("/tasks/{task_id}/evidence")
def list_task_evidence(
    task_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return evidence_service.list_task_evidence(conn, task_id, user["id"])


@router.get("/projects/{project_id}/evidence")
def list_project_evidence(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return evidence_service.list_project_evidence(conn, project_id, user["id"])
