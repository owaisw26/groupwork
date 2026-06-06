from psycopg2.extensions import connection as PgConnection

from tests.conftest import EXPECTED_TABLES


def test_migration_runner_executes_all_sql_files_in_order(db_conn: PgConnection):
    from app.db.migrate import get_migration_files, run_migrations

    migration_files = get_migration_files()
    assert len(migration_files) == 28
    assert migration_files[0].name == "001_create_users.sql"
    assert migration_files[-1].name == "028_add_project_lifecycle.sql"

    applied = run_migrations(db_conn)
    assert len(applied) == 28
    assert applied == [path.name for path in migration_files]


def test_running_migrations_twice_is_idempotent(db_conn: PgConnection):
    from app.db.migrate import run_migrations

    first_run = run_migrations(db_conn)
    second_run = run_migrations(db_conn)

    assert len(first_run) == 28
    assert second_run == []


def test_all_expected_tables_exist_after_migration(db_conn: PgConnection):
    from app.db.migrate import run_migrations

    run_migrations(db_conn)

    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
            """
        )
        tables = {row[0] for row in cur.fetchall()}

    assert tables == set(EXPECTED_TABLES)
