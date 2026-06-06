from typing import Any
from uuid import UUID

from psycopg2.extensions import connection


def create_review(
    conn: connection,
    *,
    project_id: str | UUID,
    reviewer_id: str | UUID,
    reviewee_id: str | UUID,
    contribution_quality: int,
    communication: int,
    reliability: int,
    overall: int,
    comment: str | None,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO peer_reviews (
                project_id, reviewer_id, reviewee_id,
                contribution_quality, communication, reliability, overall, comment
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, project_id, reviewer_id, reviewee_id,
                      contribution_quality, communication, reliability, overall,
                      comment, created_at
            """,
            (
                str(project_id),
                str(reviewer_id),
                str(reviewee_id),
                contribution_quality,
                communication,
                reliability,
                overall,
                comment,
            ),
        )
        row = cur.fetchone()
    return _row_to_review(row)


def get_reviewer_submissions(
    conn: connection,
    project_id: str | UUID,
    reviewer_id: str | UUID,
) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, project_id, reviewer_id, reviewee_id,
                   contribution_quality, communication, reliability, overall,
                   comment, created_at
            FROM peer_reviews
            WHERE project_id = %s AND reviewer_id = %s
            """,
            (str(project_id), str(reviewer_id)),
        )
        rows = cur.fetchall()
    return [_row_to_review(row) for row in rows]


def has_reviewed(
    conn: connection,
    project_id: str | UUID,
    reviewer_id: str | UUID,
    reviewee_id: str | UUID,
) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1 FROM peer_reviews
            WHERE project_id = %s AND reviewer_id = %s AND reviewee_id = %s
            """,
            (str(project_id), str(reviewer_id), str(reviewee_id)),
        )
        return cur.fetchone() is not None


def get_submitted_reviewer_ids(conn: connection, project_id: str | UUID) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT reviewer_id
            FROM peer_reviews
            WHERE project_id = %s
            """,
            (str(project_id),),
        )
        return [str(row[0]) for row in cur.fetchall()]


def get_aggregate_scores(conn: connection, project_id: str | UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT pr.reviewee_id, u.full_name,
                   AVG(pr.contribution_quality) AS avg_contribution_quality,
                   AVG(pr.communication) AS avg_communication,
                   AVG(pr.reliability) AS avg_reliability,
                   AVG(pr.overall) AS avg_overall,
                   COUNT(*) AS review_count
            FROM peer_reviews pr
            JOIN users u ON u.id = pr.reviewee_id
            WHERE pr.project_id = %s
            GROUP BY pr.reviewee_id, u.full_name
            ORDER BY u.full_name
            """,
            (str(project_id),),
        )
        rows = cur.fetchall()
    return [
        {
            "reviewee_id": str(row[0]),
            "reviewee_name": row[1],
            "avg_contribution_quality": round(float(row[2]), 2),
            "avg_communication": round(float(row[3]), 2),
            "avg_reliability": round(float(row[4]), 2),
            "avg_overall": round(float(row[5]), 2),
            "review_count": row[6],
        }
        for row in rows
    ]


def _row_to_review(row: tuple) -> dict[str, Any]:
    return {
        "id": row[0],
        "project_id": row[1],
        "reviewer_id": row[2],
        "reviewee_id": row[3],
        "contribution_quality": row[4],
        "communication": row[5],
        "reliability": row[6],
        "overall": row[7],
        "comment": row[8],
        "created_at": row[9],
    }


def _public_review(review: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(review["id"]),
        "reviewee_id": str(review["reviewee_id"]),
        "contribution_quality": review["contribution_quality"],
        "communication": review["communication"],
        "reliability": review["reliability"],
        "overall": review["overall"],
        "comment": review["comment"],
        "created_at": review["created_at"].isoformat(),
    }
