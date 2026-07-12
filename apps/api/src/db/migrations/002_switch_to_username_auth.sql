-- 주의: 이 마이그레이션은 이메일 기반 인증에서 사용자명 기반 인증으로 전환합니다.
-- 002 적용 시점에는 users 테이블이 비어 있으므로 사용자/대화 데이터가 소실됩니다.
-- 런칭 이후 이 마이그레이션을 재실행하면 안 됩니다. (schema_migrations에 의해 1회만 실행됨)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email'
  ) THEN
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
  END IF;
END $$;