CREATE TABLE peer_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users (id),
    reviewee_id UUID NOT NULL REFERENCES users (id),
    contribution_quality INTEGER NOT NULL CHECK (contribution_quality BETWEEN 1 AND 5),
    communication INTEGER NOT NULL CHECK (communication BETWEEN 1 AND 5),
    reliability INTEGER NOT NULL CHECK (reliability BETWEEN 1 AND 5),
    overall INTEGER NOT NULL CHECK (overall BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, reviewer_id, reviewee_id)
);
