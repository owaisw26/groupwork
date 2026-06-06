import base64
import json
from datetime import datetime
from uuid import UUID


def encode_cursor(*, sort_value: str, item_id: str | UUID) -> str:
    payload = {"v": sort_value, "id": str(item_id)}
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def decode_cursor(cursor: str) -> tuple[str, str]:
    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        payload = json.loads(raw)
        return payload["v"], payload["id"]
    except (KeyError, ValueError, json.JSONDecodeError) as exc:
        raise ValueError("Invalid cursor") from exc


def format_cursor_datetime(value: datetime) -> str:
    return value.isoformat()
