import pytest
from psycopg2.extensions import connection as PgConnection

from app.db.migrate import run_migrations


def test_foreign_key_constraint_on_tasks(db_conn: PgConnection):
    run_migrations(db_conn)

    with db_conn.cursor() as cur:
        with pytest.raises(Exception):
            cur.execute(
                """
                INSERT INTO tasks (project_id, title, status, priority, created_by)
                VALUES ('00000000-0000-0000-0000-000000000099', 'Orphan task', 'todo', 'medium',
                        '00000000-0000-0000-0000-000000000099')
                """
            )
            db_conn.commit()


def test_uuid_generation_for_primary_keys(db_conn: PgConnection):
    run_migrations(db_conn)

    with db_conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (email, password_hash, full_name)
            VALUES ('uuid-test@example.com', 'hash', 'UUID Test')
            RETURNING id
            """
        )
        user_id = cur.fetchone()[0]

    assert user_id is not None
    assert str(user_id) != "00000000-0000-0000-0000-000000000000"
