from contextlib import contextmanager
from typing import Generator

import psycopg2
from psycopg2 import pool
from psycopg2.extensions import connection

from app.config import get_settings

_pool: pool.ThreadedConnectionPool | None = None


def init_pool() -> None:
    global _pool
    if _pool is None:
        settings = get_settings()
        _pool = pool.ThreadedConnectionPool(
            minconn=5,
            maxconn=20,
            dsn=settings.DATABASE_URL,
        )


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None


@contextmanager
def get_connection() -> Generator[connection, None, None]:
    if _pool is None:
        init_pool()

    assert _pool is not None
    conn = _pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)
