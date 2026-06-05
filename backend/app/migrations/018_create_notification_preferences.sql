CREATE TABLE notification_preferences (
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (user_id, notification_type)
);
