from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from psycopg2.extensions import connection

from app.db.queries import invitations as invitation_queries
from app.db.queries import projects as project_queries
from app.db.queries import users as user_queries
from app.services import projects as project_service
from app.utils import email as email_utils
from app.utils.security import generate_token, normalize_email


def invite_member(conn: connection, project_id: str | UUID, inviter: dict, email: str) -> dict:
    email = normalize_email(email)
    project = project_service._require_member(conn, project_id, inviter["id"])

    if project_queries.get_member_count(conn, project_id) >= project["max_members"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project is full")

    if invitation_queries.get_pending_invitation(conn, project_id, email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invitation already sent")

    existing_user = user_queries.get_user_by_email(conn, email)
    if existing_user and project_queries.is_project_member(conn, project_id, existing_user["id"]):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a member")

    token = generate_token()
    invitation = invitation_queries.create_invitation(
        conn,
        project_id=project_id,
        inviter_id=inviter["id"],
        invitee_email=email,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    email_utils.send_email(
        to=email,
        subject=f"Invitation to join {project['name']} on GroupWork",
        html_body=email_utils.invite_email_body(project["name"], token),
    )
    return {
        "id": str(invitation["id"]),
        "invitee_email": invitation["invitee_email"],
        "status": invitation["status"],
    }


def accept_invitation(conn: connection, user: dict, token: str) -> dict:
    invitation = invitation_queries.get_invitation_by_token(conn, token)
    if not invitation or invitation["status"] != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invitation")

    if invitation["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation expired")

    if normalize_email(user["email"]) != normalize_email(invitation["invitee_email"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invitation not for this user",
        )

    project = project_queries.get_project(conn, invitation["project_id"])
    if not project or project["deleted_at"] is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invitation")

    if project_queries.get_member_count(conn, project["id"]) >= project["max_members"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project is full")

    if not invitation_queries.accept_invitation(conn, invitation["id"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invitation")

    project_queries.add_member(conn, project["id"], user["id"])
    project_service._log_activity(
        conn, project["id"], user["id"], "member_joined", "user", user["id"]
    )
    return {"project_id": str(project["id"]), "status": "accepted"}
