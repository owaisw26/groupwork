from fastapi import APIRouter, Depends, Request, Response, status
from psycopg2.extensions import connection

from app.db.connection import get_connection
from app.middleware.auth import ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE
from app.middleware.rate_limit import AUTH_RATE_LIMIT, limiter
from app.models.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
)
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(
    response: Response,
    *,
    access_token: str,
    refresh_token: str,
    csrf_token: str,
) -> None:
    from app.config import get_settings

    settings = get_settings()
    response.set_cookie(
        ACCESS_COOKIE,
        access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="strict",
        max_age=settings.JWT_ACCESS_TTL,
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="strict",
        max_age=settings.JWT_REFRESH_TTL,
        path="/",
    )
    response.set_cookie(
        CSRF_COOKIE,
        csrf_token,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite="strict",
        max_age=settings.JWT_REFRESH_TTL,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    from app.config import get_settings

    settings = get_settings()
    for name in (ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE):
        response.delete_cookie(name, path="/", secure=settings.COOKIE_SECURE, samesite="strict")


def _get_db() -> connection:
    with get_connection() as conn:
        yield conn


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit(AUTH_RATE_LIMIT)
def register(request: Request, body: RegisterRequest, conn: connection = Depends(_get_db)):
    return auth_service.register_user(
        conn,
        email=body.email,
        password=body.password,
        full_name=body.full_name,
    )


@router.post("/verify-email")
def verify_email(body: VerifyEmailRequest, conn: connection = Depends(_get_db)):
    return auth_service.verify_email(conn, body.token)


@router.post("/login")
@limiter.limit(AUTH_RATE_LIMIT)
def login(
    request: Request,
    body: LoginRequest,
    response: Response,
    conn: connection = Depends(_get_db),
):
    user, access_token, refresh_token, csrf_token = auth_service.login_user(
        conn,
        email=body.email,
        password=body.password,
    )
    _set_auth_cookies(
        response,
        access_token=access_token,
        refresh_token=refresh_token,
        csrf_token=csrf_token,
    )
    return user


@router.post("/refresh")
def refresh(request: Request, response: Response, conn: connection = Depends(_get_db)):
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    if not refresh_token:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    access_token, csrf_token = auth_service.refresh_session(conn, refresh_token)
    from app.config import get_settings

    settings = get_settings()
    response.set_cookie(
        ACCESS_COOKIE,
        access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="strict",
        max_age=settings.JWT_ACCESS_TTL,
        path="/",
    )
    response.set_cookie(
        CSRF_COOKIE,
        csrf_token,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite="strict",
        max_age=settings.JWT_REFRESH_TTL,
        path="/",
    )
    return {"status": "ok"}


@router.post("/logout")
def logout(request: Request, response: Response, conn: connection = Depends(_get_db)):
    auth_service.logout_user(conn, request.cookies.get(REFRESH_COOKIE))
    _clear_auth_cookies(response)
    return {"status": "ok"}


@router.post("/forgot-password")
@limiter.limit(AUTH_RATE_LIMIT)
def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    conn: connection = Depends(_get_db),
):
    auth_service.forgot_password(conn, body.email)
    return {"status": "ok"}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, conn: connection = Depends(_get_db)):
    auth_service.reset_password(conn, token=body.token, password=body.password)
    return {"status": "ok"}
