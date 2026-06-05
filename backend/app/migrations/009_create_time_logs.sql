CREATE TABLE time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id),
    hours NUMERIC(6, 2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_logs_task_id ON time_logs (task_id);
CREATE INDEX idx_time_logs_user_id ON time_logs (user_id);

CREATE OR REPLACE FUNCTION prevent_time_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'time_logs table is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_logs_no_update
    BEFORE UPDATE ON time_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_time_log_modification();

CREATE TRIGGER time_logs_no_delete
    BEFORE DELETE ON time_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_time_log_modification();
