import logging

from app.config import get_settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html_body: str) -> None:
    settings = get_settings()
    if not settings.SES_SENDER_EMAIL:
        logger.warning("SES_SENDER_EMAIL not configured; logging email to stdout for %s", to)
        print(f"[DEV EMAIL] To: {to}\nSubject: {subject}\n{html_body}", flush=True)
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
    return (
        f"<p>Verify your GroupWork account.</p>"
        f'<p><a href="{settings.FRONTEND_URL}/verify-email/{token}">'
        f"Verify email</a></p>"
    )


def invite_email_body(project_name: str, token: str) -> str:
    settings = get_settings()
    return (
        f"<p>You have been invited to join <strong>{project_name}</strong> on GroupWork.</p>"
        f'<p><a href="{settings.FRONTEND_URL}/invitations/accept/{token}">'
        f"Accept invitation</a></p>"
    )


def password_reset_email_body(token: str) -> str:
    settings = get_settings()
    return (
        f"<p>Reset your GroupWork password.</p>"
        f'<p><a href="{settings.FRONTEND_URL}/reset-password/{token}">'
        f"Reset password</a></p>"
    )
