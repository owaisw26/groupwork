CREATE TABLE meeting_attendance (
    meeting_id UUID NOT NULL REFERENCES meetings (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    attended BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (meeting_id, user_id)
);
