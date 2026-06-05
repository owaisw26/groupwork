import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.middleware.auth import CSRF_COOKIE

CSRF_EXEMPT_PATHS = {
    "/api/v1/auth/register",
    "/api/v1/auth/login",
    "/api/v1/auth/verify-email",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/refresh",
    "/api/v1/health",
}


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            if request.url.path not in CSRF_EXEMPT_PATHS:
                cookie_token = request.cookies.get(CSRF_COOKIE)
                header_token = request.headers.get("X-CSRF-Token")
                if (
                    not cookie_token
                    or not header_token
                    or not secrets.compare_digest(cookie_token, header_token)
                ):
                    return JSONResponse(
                        status_code=403,
                        content={
                            "error": {
                                "code": "FORBIDDEN",
                                "message": "CSRF validation failed",
                            }
                        },
                    )

        return await call_next(request)
