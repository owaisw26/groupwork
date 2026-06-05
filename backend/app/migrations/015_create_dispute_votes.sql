CREATE TABLE dispute_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id),
    vote VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dispute_id, user_id)
);
