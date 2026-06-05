from pathlib import Path

from psycopg2.extensions import connection

MIGRATIONS_DIR = Path(__file__).parent.parent / "migrations"


def get_migration_files() -> list[Path]:
    return sorted(MIGRATIONS_DIR.glob("*.sql"))


def _ensure_schema_migrations_table(conn: connection) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )


def _get_applied_migrations(conn: connection) -> set[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT filename FROM schema_migrations")
        return {row[0] for row in cur.fetchall()}


def run_migrations(conn: connection) -> list[str]:
    _ensure_schema_migrations_table(conn)
    applied = _get_applied_migrations(conn)
    newly_applied: list[str] = []

    for migration_file in get_migration_files():
        if migration_file.name in applied:
            continue

        sql = migration_file.read_text()
        with conn.cursor() as cur:
            cur.execute(sql)
            cur.execute(
                "INSERT INTO schema_migrations (filename) VALUES (%s)",
                (migration_file.name,),
            )
        conn.commit()
        newly_applied.append(migration_file.name)

    return newly_applied


def main() -> None:
    from app.db.connection import close_pool, get_connection, init_pool

    init_pool()
    try:
        with get_connection() as conn:
            applied = run_migrations(conn)
            if applied:
                print(f"Applied {len(applied)} migration(s): {', '.join(applied)}")
            else:
                print("No pending migrations.")
    finally:
        close_pool()


if __name__ == "__main__":
    main()
