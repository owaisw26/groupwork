UPDATE users SET email = LOWER(email);

ALTER TABLE users DROP CONSTRAINT users_email_key;

CREATE UNIQUE INDEX users_email_lower_unique ON users (LOWER(email));
