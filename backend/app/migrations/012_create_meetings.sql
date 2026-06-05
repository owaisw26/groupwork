CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    meeting_date TIMESTAMPTZ NOT NULL,
    agenda TEXT,
    discussion_points TEXT,
    action_items_json JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
