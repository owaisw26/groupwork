from tests.auth_helpers import register_user


def test_register_sql_injection_email_does_not_break_database(auth_client, db_conn):
    response = register_user(
        auth_client,
        email="'; DROP TABLE users; --",
        password="Password1",
        full_name="SQL Test",
    )

    assert response.status_code in (201, 422)

    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'users'
            """
        )
        assert cur.fetchone() is not None
