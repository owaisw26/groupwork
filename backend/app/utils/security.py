import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

from app.config import get_settings

ALGORITHM = "HS256"
INVALID_CREDENTIALS_MSG = "Invalid email or password"
# Precomputed bcrypt hash for constant-time comparison when user is not found.
DUMMY_PASSWORD_HASH = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def verify_password_constant_time(plain_password: str, hashed_password: str | None) -> bool:
    if not hashed_password:
        return verify_password(plain_password, DUMMY_PASSWORD_HASH)
    return verify_password(plain_password, hashed_password)


def validate_password_strength(password: str) -> list[str]:
    errors: list[str] = []
    if len(password.encode("utf-8")) > 72:
        errors.append("Password must be at most 72 characters")
    if len(password) < 8:
        errors.append("Password must be at least 8 characters")
    if not any(char.isupper() for char in password):
        errors.append("Password must contain an uppercase letter")
    if not any(char.islower() for char in password):
        errors.append("Password must contain a lowercase letter")
    if not any(char.isdigit() for char in password):
        errors.append("Password must contain a digit")
    return errors


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(seconds=settings.JWT_ACCESS_TTL)
    return jwt.encode(
        {"sub": user_id, "exp": expire, "type": "access", "jti": generate_token()},
        settings.JWT_SECRET,
        algorithm=ALGORITHM,
    )


def decode_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)
