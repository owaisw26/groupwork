ALTER TABLE projects ADD COLUMN completed_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN peer_review_ends_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN report_s3_key TEXT;
ALTER TABLE projects ADD COLUMN archived_at TIMESTAMPTZ;
