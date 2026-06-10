import html
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html_body: str) -> None:
    logger.info(
        "Email delivery disabled; skipped email to %s with subject %s",
        to,
        subject,
    )


def verification_email_body(token: str) -> str:
    settings = get_settings()
    safe_url = html.escape(settings.FRONTEND_URL)
    return (
        f"<p>Verify your FairShare account.</p>"
        f'<p><a href="{safe_url}/verify-email/{token}">'
        f"Verify email</a></p>"
    )


def invite_email_body(project_name: str, token: str) -> str:
    settings = get_settings()
    safe_name = html.escape(project_name)
    safe_url = html.escape(settings.FRONTEND_URL)
    return (
        f"<p>You have been invited to join <strong>{safe_name}</strong> on FairShare.</p>"
        f'<p><a href="{safe_url}/invitations/accept/{token}">'
        f"Accept invitation</a></p>"
    )


def password_reset_email_body(token: str) -> str:
    settings = get_settings()
    safe_url = html.escape(settings.FRONTEND_URL)
    return (
        f"<p>Reset your FairShare password.</p>"
        f'<p><a href="{safe_url}/reset-password/{token}">'
        f"Reset password</a></p>"
    )
