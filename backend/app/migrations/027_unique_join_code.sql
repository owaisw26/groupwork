CREATE UNIQUE INDEX idx_projects_join_code_unique ON projects (join_code) WHERE deleted_at IS NULL;
