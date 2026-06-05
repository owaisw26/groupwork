CREATE TABLE evidence_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id),
    s3_key VARCHAR(512) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(127) NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
