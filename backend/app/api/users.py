from fastapi import APIRouter, Depends, Request
from psycopg2.extensions import connection

from app.db.connection import get_connection
from app.db.queries import users as user_queries
from app.middleware.auth import get_verified_user
from app.models.auth import UpdateProfileRequest

router = APIRouter(prefix="/users", tags=["users"])


def _get_db() -> connection:
    with get_connection() as conn:
        yield conn


@router.get("/me")
def get_me(request: Request):
    user = get_verified_user(request)
    return user_queries.public_user(user)


@router.put("/me")
def update_me(
    request: Request,
    body: UpdateProfileRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    updated = user_queries.update_full_name(conn, user["id"], body.full_name)
    return user_queries.public_user(updated)
