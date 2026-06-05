CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    course VARCHAR(255),
    due_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    owner_id UUID NOT NULL REFERENCES users (id),
    join_code VARCHAR(6) NOT NULL,
    join_code_expires_at TIMESTAMPTZ NOT NULL,
    max_members INTEGER NOT NULL DEFAULT 6,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_owner_id ON projects (owner_id);
CREATE INDEX idx_projects_status ON projects (status);
