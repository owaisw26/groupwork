import html
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html_body: str) -> None:
    settings = get_settings()
    if not settings.SES_SENDER_EMAIL:
        logger.warning("SES_SENDER_EMAIL not configured; logging email to stdout for %s", to)
        print(f"[DEV EMAIL] To: {to}\nSubject: {subject}\n[body redacted]", flush=True)
        return

    import boto3

    client = boto3.client("ses", region_name=settings.AWS_REGION)
    client.send_email(
        Source=settings.SES_SENDER_EMAIL,
        Destination={"ToAddresses": [to]},
        Message={
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": {"Html": {"Data": html_body, "Charset": "UTF-8"}},
        },
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


def notification_email_body(title: str, message: str, *, notification_type: str) -> str:
    safe_title = html.escape(title)
    safe_message = html.escape(message)
    safe_type = html.escape(notification_type.replace("_", " "))
    settings = get_settings()
    safe_url = html.escape(settings.FRONTEND_URL)
    return (
        f"<div style='font-family:Arial,sans-serif;max-width:560px'>"
        f"<p><strong>FairShare</strong> &mdash; {safe_type}</p>"
        f"<h2 style='color:#1565C0'>{safe_title}</h2>"
        f"<p>{safe_message}</p>"
        f'<p><a href="{safe_url}/notifications">View notifications</a></p>'
        f"<p style='color:#666;font-size:12px'>"
        f"You can manage email preferences in your profile settings."
        f"</p></div>"
    )


def password_reset_email_body(token: str) -> str:
    settings = get_settings()
    safe_url = html.escape(settings.FRONTEND_URL)
    return (
        f"<p>Reset your FairShare password.</p>"
        f'<p><a href="{safe_url}/reset-password/{token}">'
        f"Reset password</a></p>"
    )
