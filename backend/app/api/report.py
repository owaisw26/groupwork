from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from psycopg2.extensions import connection

from app.db.connection import get_connection
from app.middleware.auth import get_verified_user
from app.middleware.rate_limit import limiter
from app.services import report as report_service

REPORT_PDF_RATE_LIMIT = "2/hour"

router = APIRouter(tags=["report"])


def _get_db() -> connection:
    with get_connection() as conn:
        yield conn


@router.get("/projects/{project_id}/report/preview")
def get_report_preview(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return report_service.generate_report_data(conn, project_id, user["id"])


@router.get("/projects/{project_id}/report")
@limiter.limit(REPORT_PDF_RATE_LIMIT)
def get_report_pdf(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    pdf_bytes = report_service.generate_pdf(conn, project_id, user["id"])
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="project-{project_id}-contribution-report.pdf"'
            )
        },
    )
