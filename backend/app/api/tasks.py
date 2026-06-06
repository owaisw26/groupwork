from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from psycopg2.extensions import connection

from app.db.connection import get_connection
from app.middleware.auth import get_verified_user
from app.models.tasks import (
    CreateCommentRequest,
    CreateSubtaskRequest,
    CreateTaskRequest,
    EditRequestBody,
    ReviewEditRequestBody,
    ToggleSubtaskRequest,
    UpdateCommentRequest,
    UpdateTaskRequest,
    UpdateTaskStatusRequest,
)
from app.models.verification import DisputeTaskRequest
from app.services import tasks as task_service
from app.services import verification as verification_service

router = APIRouter(tags=["tasks"])


def _get_db() -> connection:
    with get_connection() as conn:
        yield conn


@router.post("/projects/{project_id}/tasks", status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: UUID,
    request: Request,
    body: CreateTaskRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return task_service.create_task(
        conn,
        project_id,
        user,
        title=body.title,
        description=body.description,
        status_value=body.status,
        priority=body.priority,
        due_date=body.due_date,
        assignee_ids=body.assignee_ids,
    )


@router.get("/projects/{project_id}/tasks")
def list_project_tasks(
    project_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
    status_filter: str | None = Query(default=None, alias="status"),
    assignee_id: UUID | None = None,
    priority: str | None = None,
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
):
    user = get_verified_user(request)
    return task_service.list_project_tasks(
        conn,
        project_id,
        user["id"],
        status_filter=status_filter,
        assignee_id=str(assignee_id) if assignee_id else None,
        priority=priority,
        cursor=cursor,
        limit=limit,
    )


@router.get("/tasks/{task_id}")
def get_task(
    task_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return task_service.get_task(conn, task_id, user["id"])


@router.put("/tasks/{task_id}")
def update_task(
    task_id: UUID,
    request: Request,
    body: UpdateTaskRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return task_service.update_task(
        conn,
        task_id,
        user["id"],
        title=body.title,
        description=body.description,
        priority=body.priority,
        due_date=body.due_date,
        assignee_ids=body.assignee_ids,
    )


@router.patch("/tasks/{task_id}/status")
def update_task_status(
    task_id: UUID,
    request: Request,
    body: UpdateTaskStatusRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return task_service.update_task_status(conn, task_id, user["id"], body.status)


@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    task_service.delete_task(conn, task_id, user["id"])
    return {"status": "ok"}


@router.post("/tasks/{task_id}/subtasks", status_code=status.HTTP_201_CREATED)
def create_subtask(
    task_id: UUID,
    request: Request,
    body: CreateSubtaskRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return task_service.create_subtask(conn, task_id, user["id"], title=body.title)


@router.get("/tasks/{task_id}/subtasks")
def list_subtasks(
    task_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return task_service.list_subtasks(conn, task_id, user["id"])


@router.patch("/tasks/{task_id}/subtasks/{subtask_id}")
def toggle_subtask(
    task_id: UUID,
    subtask_id: UUID,
    request: Request,
    body: ToggleSubtaskRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return task_service.toggle_subtask(
        conn, task_id, subtask_id, user["id"], is_completed=body.is_completed
    )


@router.post("/tasks/{task_id}/comments", status_code=status.HTTP_201_CREATED)
def create_comment(
    task_id: UUID,
    request: Request,
    body: CreateCommentRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return task_service.create_comment(conn, task_id, user, content=body.content)


@router.get("/tasks/{task_id}/comments")
def list_comments(
    task_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return task_service.list_comments(conn, task_id, user["id"])


@router.put("/tasks/{task_id}/comments/{comment_id}")
def update_comment(
    task_id: UUID,
    comment_id: UUID,
    request: Request,
    body: UpdateCommentRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return task_service.update_comment(
        conn, task_id, comment_id, user["id"], content=body.content
    )


@router.post("/tasks/{task_id}/request-edit", status_code=status.HTTP_201_CREATED)
def submit_edit_request(
    task_id: UUID,
    request: Request,
    body: EditRequestBody,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return task_service.submit_edit_request(
        conn, task_id, user, proposed_changes=body.proposed_changes
    )


@router.post("/tasks/{task_id}/edit-requests/{request_id}/review")
def review_edit_request(
    task_id: UUID,
    request_id: UUID,
    request: Request,
    body: ReviewEditRequestBody,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return task_service.review_edit_request(
        conn, task_id, request_id, user["id"], approved=body.approved
    )


@router.get("/tasks/{task_id}/edit-requests")
def list_edit_requests(
    task_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return task_service.list_edit_requests(conn, task_id, user["id"])


@router.post("/tasks/{task_id}/verify")
def verify_task(
    task_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return verification_service.verify_task(conn, task_id, user["id"])


@router.post("/tasks/{task_id}/dispute", status_code=status.HTTP_201_CREATED)
def dispute_task(
    task_id: UUID,
    request: Request,
    body: DisputeTaskRequest,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return verification_service.dispute_task(
        conn,
        task_id,
        user["id"],
        reason=body.reason,
    )


@router.get("/tasks/{task_id}/verifications")
def list_task_verifications(
    task_id: UUID,
    request: Request,
    conn: connection = Depends(_get_db),
):
    user = get_verified_user(request)
    return verification_service.list_task_verifications(conn, task_id, user["id"])


@router.get("/my-tasks")
def list_my_tasks(
    request: Request,
    conn: connection = Depends(_get_db),
    sort_by: str = Query(default="due_date"),
    sort_order: str = Query(default="asc"),
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
):
    user = get_verified_user(request)
    return task_service.list_my_tasks(
        conn,
        user["id"],
        sort_by=sort_by,
        sort_order=sort_order,
        cursor=cursor,
        limit=limit,
    )
