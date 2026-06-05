CREATE TABLE subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_by UUID REFERENCES users (id),
    completed_at TIMESTAMPTZ
);
