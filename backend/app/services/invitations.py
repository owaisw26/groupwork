from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from psycopg2.extensions import connection

from app.db.queries import invitations as invitation_queries
from app.db.queries import projects as project_queries
from app.db.queries import users as user_queries
from app.services import notifications as notification_service
from app.utils.email import invite_email_body, send_email
from app.utils.security import generate_token, hash_token, normalize_email

INVITATION_TTL_DAYS = 7


def _invitation_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=INVITATION_TTL_DAYS)


def _require_member(conn: connection, project_id: str | UUID, user_id: str | UUID) -> dict:
    project = project_queries.get_project(conn, project_id)
    if not project or project["deleted_at"] is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if not project_queries.is_project_member(conn, project_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")
    return project


def _ensure_project_has_capacity(conn: connection, project: dict) -> None:
    if project_queries.get_member_count(conn, project["id"]) >= project["max_members"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project is full")


def invite_member(
    conn: connection,
    project_id: str | UUID,
    user: dict,
    email: str,
) -> dict:
    project = _require_member(conn, project_id, user["id"])
    normalized_email = normalize_email(email)
    _ensure_project_has_capacity(conn, project)

    existing_user = project_queries.get_project_members(conn, project_id)
    if any(member["email"] == normalized_email for member in existing_user):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a project member",
        )

    if invitation_queries.get_pending_invitation(conn, project_id, normalized_email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invitation already sent",
        )

    token = generate_token()
    invitation = invitation_queries.create_invitation(
        conn,
        project_id=project_id,
        inviter_id=user["id"],
        invitee_email=normalized_email,
        token_hash=hash_token(token),
        expires_at=_invitation_expiry(),
    )

    invitee = user_queries.get_user_by_email(conn, normalized_email)
    subject = f"Invitation to join {project['name']} on GroupWork"
    body = invite_email_body(project["name"], token)
    if invitee:
        notification_service.notify(
            conn,
            user_id=invitee["id"],
            notification_type="invitation",
            title="Project invitation",
            message=f"You were invited to join {project['name']}.",
            entity_type="invitation",
            entity_id=invitation["id"],
            recipient_email=invitee["email"],
            email_subject=subject,
            email_body=body,
        )
    else:
        send_email(normalized_email, subject, body)

    return {
        "id": str(invitation["id"]),
        "project_id": str(invitation["project_id"]),
        "invitee_email": invitation["invitee_email"],
        "status": invitation["status"],
        "expires_at": invitation["expires_at"].isoformat(),
    }


def accept_invitation(conn: connection, user: dict, token: str) -> dict:
    invitation = invitation_queries.get_invitation_by_token_hash(conn, hash_token(token))
    if not invitation:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invitation")

    if invitation["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation already used",
        )

    if invitation["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation expired")

    if normalize_email(user["email"]) != invitation["invitee_email"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invitation was sent to a different email address",
        )

    project = project_queries.get_project_for_update(conn, invitation["project_id"])
    if not project or project["deleted_at"] is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project_queries.is_project_member(conn, project["id"], user["id"]):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already a member")

    _ensure_project_has_capacity(conn, project)

    if not invitation_queries.mark_invitation_accepted(conn, invitation["id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation already used",
        )

    project_queries.add_member(conn, project["id"], user["id"])
    member_count = project_queries.get_member_count(conn, project["id"])

    return {
        "project_id": str(project["id"]),
        "project_name": project["name"],
        "member_count": member_count,
    }
