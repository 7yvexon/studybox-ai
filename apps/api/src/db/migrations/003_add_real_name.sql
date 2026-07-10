ALTER TABLE users ADD COLUMN IF NOT EXISTS real_name TEXT;

UPDATE users SET real_name = '이름 미입력' WHERE real_name IS NULL;

ALTER TABLE users
  ALTER COLUMN real_name SET NOT NULL,
  ADD CONSTRAINT users_real_name_length_check CHECK (char_length(real_name) BETWEEN 1 AND 50);
