CREATE TABLE task_edit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users (id),
    proposed_changes_json JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);
