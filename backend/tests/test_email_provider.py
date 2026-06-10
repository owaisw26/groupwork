import pytest

from app.config import get_settings
from app.utils import email


def test_send_email_uses_resend_when_api_key_configured(monkeypatch):
    calls = []
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setenv("EMAIL_FROM", "FairShare <hello@example.com>")
    get_settings.cache_clear()

    class FakeResponse:
        def raise_for_status(self):
            return None

    def fake_post(url, *, headers, json, timeout):
        calls.append(
            {
                "url": url,
                "headers": headers,
                "json": json,
                "timeout": timeout,
            },
        )
        return FakeResponse()

    monkeypatch.setattr(email.httpx, "post", fake_post)

    email.send_email("student@example.com", "Welcome", "<p>Hello</p>")

    assert calls == [
        {
            "url": "https://api.resend.com/emails",
            "headers": {
                "Authorization": "Bearer re_test_key",
                "Content-Type": "application/json",
            },
            "json": {
                "from": "FairShare <hello@example.com>",
                "to": ["student@example.com"],
                "subject": "Welcome",
                "html": "<p>Hello</p>",
            },
            "timeout": 10,
        },
    ]


def test_send_email_logs_to_stdout_when_no_provider_configured(monkeypatch, capsys):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("EMAIL_FROM", raising=False)
    monkeypatch.delenv("SES_SENDER_EMAIL", raising=False)
    get_settings.cache_clear()

    email.send_email("student@example.com", "Welcome", "<p>Hello</p>")

    output = capsys.readouterr().out
    assert "[DEV EMAIL] To: student@example.com" in output
    assert "Subject: Welcome" in output


@pytest.fixture(autouse=True)
def clear_settings_after_test():
    yield
    get_settings.cache_clear()
