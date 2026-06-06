from datetime import date
from uuid import UUID

from fastapi import HTTPException, status
from psycopg2.extensions import connection

from app.db.queries import comments as comment_queries
from app.db.queries import projects as project_queries
from app.db.queries import subtasks as subtask_queries
from app.db.queries import task_edit_requests as edit_request_queries
from app.db.queries import tasks as task_queries
from app.db.queries.tasks import VALID_PRIORITIES, VALID_STATUSES, _public_task
from app.utils.pagination import decode_cursor


def _create_notification(
    conn: connection,
    *,
    user_id: str | UUID,
    notification_type: str,
    title: str,
    message: str,
    entity_type: str,
    entity_id: str | UUID,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO notifications (
                user_id, type, title, message, related_entity_type, related_entity_id
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                str(user_id),
                notification_type,
                title,
                message,
                entity_type,
                str(entity_id),
            ),
        )


def _require_task_access(conn: connection, task_id: str | UUID, user_id: str | UUID) -> dict:
    task = task_queries.get_task(conn, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    project = project_queries.get_project(conn, task["project_id"])
    if not project or project["deleted_at"] is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not project_queries.is_project_member(conn, task["project_id"], user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")
    return task


def _require_project_member(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
) -> dict:
    project = project_queries.get_project(conn, project_id)
    if not project or project["deleted_at"] is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if not project_queries.is_project_member(conn, project_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")
    return project


def _require_project_owner(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
) -> dict:
    project = _require_project_member(conn, project_id, user_id)
    if str(project["owner_id"]) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner can do this",
        )
    return project


def _validate_status(status_value: str) -> None:
    if status_value not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}",
        )


def _validate_priority(priority: str) -> None:
    if priority not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid priority. Must be one of: {', '.join(sorted(VALID_PRIORITIES))}",
        )


def _validate_assignees(
    conn: connection,
    project_id: str | UUID,
    assignee_ids: list[str],
) -> None:
    for assignee_id in assignee_ids:
        if not project_queries.is_project_member(conn, project_id, assignee_id):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"User {assignee_id} is not a project member",
            )


def _apply_approved_edit_changes(
    conn: connection,
    task_id: str | UUID,
    project_id: str | UUID,
    changes: dict,
) -> None:
    update_kwargs: dict = {}
    for field in ("title", "description", "priority", "due_date", "assignee_ids"):
        if field in changes:
            update_kwargs[field] = changes[field]

    if "assignee_ids" in update_kwargs:
        assignee_ids = update_kwargs["assignee_ids"] or []
        _validate_assignees(conn, project_id, assignee_ids)

    if update_kwargs:
        updated = task_queries.update_task(conn, task_id, **update_kwargs)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found while applying edit request",
            )

    if "status" in changes:
        _validate_status(changes["status"])
        status_updated = task_queries.update_task_status(conn, task_id, changes["status"])
        if not status_updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found while applying status change",
            )


def _log_activity(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
    action_type: str,
    entity_type: str,
    entity_id: str | UUID,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO activity_log (project_id, user_id, action_type, entity_type, entity_id)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (str(project_id), str(user_id), action_type, entity_type, str(entity_id)),
        )


def create_task(
    conn: connection,
    project_id: str | UUID,
    user: dict,
    *,
    title: str,
    description: str | None,
    status_value: str,
    priority: str,
    due_date: date | None,
    assignee_ids: list[str],
) -> dict:
    _require_project_member(conn, project_id, user["id"])
    _validate_status(status_value)
    _validate_priority(priority)

    resolved_assignees = assignee_ids or [user["id"]]
    _validate_assignees(conn, project_id, resolved_assignees)

    task = task_queries.create_task(
        conn,
        project_id=project_id,
        title=title,
        description=description,
        status=status_value,
        priority=priority,
        due_date=due_date,
        created_by=user["id"],
        assignee_ids=resolved_assignees,
    )
    _log_activity(conn, project_id, user["id"], "task_created", "task", task["id"])
    for assignee_id in resolved_assignees:
        if str(assignee_id) != str(user["id"]):
            _create_notification(
                conn,
                user_id=assignee_id,
                notification_type="task_assigned",
                title="Task assigned to you",
                message=f"You were assigned to task: {title}",
                entity_type="task",
                entity_id=task["id"],
            )
    return _public_task(task)


def list_project_tasks(
    conn: connection,
    project_id: str | UUID,
    user_id: str | UUID,
    *,
    status_filter: str | None = None,
    assignee_id: str | None = None,
    priority: str | None = None,
    cursor: str | None = None,
    limit: int = 20,
) -> dict:
    _require_project_member(conn, project_id, user_id)
    if status_filter:
        _validate_status(status_filter)
    if priority:
        _validate_priority(priority)
    if cursor:
        try:
            decode_cursor(cursor)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid cursor",
            ) from exc
    return task_queries.list_project_tasks(
        conn,
        project_id,
        status=status_filter,
        assignee_id=assignee_id,
        priority=priority,
        cursor=cursor,
        limit=min(limit, 100),
    )


def get_task(conn: connection, task_id: str | UUID, user_id: str | UUID) -> dict:
    task = _require_task_access(conn, task_id, user_id)
    return _public_task(task)


def update_task(
    conn: connection,
    task_id: str | UUID,
    user_id: str | UUID,
    *,
    title: str | None = None,
    description: str | None = None,
    priority: str | None = None,
    due_date: date | None = None,
    assignee_ids: list[str] | None = None,
) -> dict:
    task = _require_task_access(conn, task_id, user_id)
    project = project_queries.get_project(conn, task["project_id"])
    if str(project["owner_id"]) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner can edit tasks directly",
        )
    if priority is not None:
        _validate_priority(priority)
    if assignee_ids is not None:
        _validate_assignees(conn, task["project_id"], assignee_ids)

    updated = task_queries.update_task(
        conn,
        task_id,
        title=title,
        description=description,
        priority=priority,
        due_date=due_date,
        assignee_ids=assignee_ids,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    _log_activity(conn, task["project_id"], user_id, "task_updated", "task", task_id)
    return _public_task(updated)


def update_task_status(
    conn: connection,
    task_id: str | UUID,
    user_id: str | UUID,
    status_value: str,
) -> dict:
    task = _require_task_access(conn, task_id, user_id)
    _validate_status(status_value)
    updated = task_queries.update_task_status(conn, task_id, status_value)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if status_value == "done" and task["status"] != "done":
        from app.services.verification import notify_verification_needed

        notify_verification_needed(conn, updated)
    return _public_task(updated)


def delete_task(conn: connection, task_id: str | UUID, user_id: str | UUID) -> None:
    task = _require_task_access(conn, task_id, user_id)
    _require_project_owner(conn, task["project_id"], user_id)
    if not task_queries.delete_task(conn, task_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")


def create_subtask(
    conn: connection,
    task_id: str | UUID,
    user_id: str | UUID,
    *,
    title: str,
) -> dict:
    _require_task_access(conn, task_id, user_id)
    return subtask_queries.create_subtask(conn, task_id=task_id, title=title)


def list_subtasks(conn: connection, task_id: str | UUID, user_id: str | UUID) -> list[dict]:
    _require_task_access(conn, task_id, user_id)
    return subtask_queries.list_subtasks(conn, task_id)


def toggle_subtask(
    conn: connection,
    task_id: str | UUID,
    subtask_id: str | UUID,
    user_id: str | UUID,
    *,
    is_completed: bool,
) -> dict:
    _require_task_access(conn, task_id, user_id)
    if not task_queries.is_task_assignee(conn, task_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only task assignees can toggle subtasks",
        )
    subtask = subtask_queries.get_subtask(conn, subtask_id)
    if not subtask or str(subtask["task_id"]) != str(task_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    updated = subtask_queries.toggle_subtask(
        conn, subtask_id, user_id=user_id, is_completed=is_completed
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    return updated


def create_comment(
    conn: connection,
    task_id: str | UUID,
    user: dict,
    *,
    content: str,
) -> dict:
    _require_task_access(conn, task_id, user["id"])
    return comment_queries.create_comment(
        conn, task_id=task_id, user_id=user["id"], content=content
    )


def list_comments(conn: connection, task_id: str | UUID, user_id: str | UUID) -> list[dict]:
    _require_task_access(conn, task_id, user_id)
    return comment_queries.list_task_comments(conn, task_id)


def update_comment(
    conn: connection,
    task_id: str | UUID,
    comment_id: str | UUID,
    user_id: str | UUID,
    *,
    content: str,
) -> dict:
    _require_task_access(conn, task_id, user_id)
    comment = comment_queries.get_comment(conn, comment_id)
    if not comment or str(comment["task_id"]) != str(task_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    try:
        updated = comment_queries.update_comment(
            conn, comment_id, user_id=user_id, content=content
        )
    except ValueError as exc:
        if str(exc) == "edit_window_expired":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Comment edit window has expired",
            ) from exc
        raise
    if not updated:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not comment author")
    return updated


def submit_edit_request(
    conn: connection,
    task_id: str | UUID,
    user: dict,
    *,
    proposed_changes: dict,
) -> dict:
    task = _require_task_access(conn, task_id, user["id"])
    project = project_queries.get_project(conn, task["project_id"])
    if str(project["owner_id"]) == str(user["id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project owner can edit tasks directly",
        )
    if "status" in proposed_changes:
        _validate_status(proposed_changes["status"])
    if "priority" in proposed_changes:
        _validate_priority(proposed_changes["priority"])

    request = edit_request_queries.create_edit_request(
        conn,
        task_id=task_id,
        requested_by=user["id"],
        proposed_changes=proposed_changes,
    )
    _create_notification(
        conn,
        user_id=project["owner_id"],
        notification_type="task_edit_request",
        title="Task edit request",
        message=f"A member requested changes to task: {task['title']}",
        entity_type="task_edit_request",
        entity_id=request["id"],
    )
    return request


def review_edit_request(
    conn: connection,
    task_id: str | UUID,
    request_id: str | UUID,
    user_id: str | UUID,
    *,
    approved: bool,
) -> dict:
    task = _require_task_access(conn, task_id, user_id)
    _require_project_owner(conn, task["project_id"], user_id)

    edit_request = edit_request_queries.get_edit_request(conn, request_id)
    if not edit_request or str(edit_request["task_id"]) != str(task_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edit request not found")
    if edit_request["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Edit request already reviewed",
        )

    reviewed = edit_request_queries.review_edit_request(
        conn, request_id, reviewed_by=user_id, approved=approved
    )
    if not reviewed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edit request not found")

    if approved:
        _apply_approved_edit_changes(
            conn,
            task_id,
            task["project_id"],
            edit_request["proposed_changes"],
        )

    notification_title = "Edit request approved" if approved else "Edit request rejected"
    notification_message = (
        f"Your edit request for task '{task['title']}' was approved."
        if approved
        else f"Your edit request for task '{task['title']}' was rejected."
    )
    _create_notification(
        conn,
        user_id=edit_request["requested_by"],
        notification_type="task_edit_request_reviewed",
        title=notification_title,
        message=notification_message,
        entity_type="task",
        entity_id=task_id,
    )
    return reviewed


def list_edit_requests(
    conn: connection,
    task_id: str | UUID,
    user_id: str | UUID,
) -> list[dict]:
    task = _require_task_access(conn, task_id, user_id)
    _require_project_owner(conn, task["project_id"], user_id)
    return edit_request_queries.list_pending_edit_requests(conn, task_id)


def list_my_tasks(
    conn: connection,
    user_id: str | UUID,
    *,
    sort_by: str = "due_date",
    sort_order: str = "asc",
    cursor: str | None = None,
    limit: int = 20,
) -> dict:
    if cursor:
        try:
            decode_cursor(cursor)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid cursor",
            ) from exc
    return task_queries.list_user_tasks_across_projects(
        conn,
        user_id,
        sort_by=sort_by,
        sort_order=sort_order,
        cursor=cursor,
        limit=min(limit, 100),
    )


def search_tasks(
    conn: connection,
    user_id: str | UUID,
    *,
    query: str,
    cursor: str | None = None,
    limit: int = 20,
) -> dict:
    if not query.strip():
        return {"items": [], "next_cursor": None}
    if cursor:
        try:
            decode_cursor(cursor)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid cursor",
            ) from exc
    return task_queries.search_tasks_by_title(
        conn,
        user_id,
        query=query.strip(),
        cursor=cursor,
        limit=min(limit, 100),
    )
