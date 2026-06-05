CREATE INDEX idx_email_verifications_token_hash ON email_verifications (token_hash);
CREATE INDEX idx_password_resets_token_hash ON password_resets (token_hash);
