CREATE TABLE task_assignees (
    task_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, user_id)
);
