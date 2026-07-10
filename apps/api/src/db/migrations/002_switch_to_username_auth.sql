DELETE FROM invite_codes WHERE used_by IS NOT NULL;

DELETE FROM users;

DROP TABLE IF EXISTS auth_tokens;

ALTER TABLE users
  DROP COLUMN email,
  DROP COLUMN email_verified_at,
  ADD COLUMN username TEXT NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{4,20}$'),
  ADD COLUMN school_name TEXT NOT NULL CHECK (char_length(school_name) BETWEEN 1 AND 100),
  ADD COLUMN grade SMALLINT NOT NULL CHECK (grade BETWEEN 1 AND 6),
  ADD COLUMN class_number SMALLINT NOT NULL CHECK (class_number BETWEEN 1 AND 99),
  ADD COLUMN student_number SMALLINT NOT NULL CHECK (student_number BETWEEN 1 AND 99);
