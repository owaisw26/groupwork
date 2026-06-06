import threading
from contextlib import contextmanager
from typing import Generator

from psycopg2 import pool
from psycopg2.extensions import connection

from app.config import get_settings

_pool: pool.ThreadedConnectionPool | None = None
_pool_lock = threading.Lock()


def init_pool() -> None:
    global _pool
    with _pool_lock:
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
        try:
            conn.rollback()
        except Exception:
            pass
        raise
    finally:
        _pool.putconn(conn)
