from fastapi import APIRouter, Depends, Request
from psycopg2.extensions import connection

from app.db.connection import get_connection
from app.middleware.auth import get_verified_user
from app.models.projects import AcceptInvitationRequest
from app.services import invitations as invitation_service

router = APIRouter(prefix="/invitations", tags=["invitations"])


def _get_db() -> connection:
    with get_connection() as conn:
        yield conn


@router.post("/accept")
def accept_invitation(
    request: Request,
    body: AcceptInvitationRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return invitation_service.accept_invitation(conn, user, body.token)
