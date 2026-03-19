-- Login security: track failed login attempts per email
-- Max 5 attempts, then permanent lockout until password reset

CREATE TABLE IF NOT EXISTS login_security (
  email        text PRIMARY KEY,
  attempts     integer      DEFAULT 0   NOT NULL,
  locked       boolean      DEFAULT false NOT NULL,
  locked_at    timestamptz,
  last_attempt_at timestamptz
);

-- Only accessible via service role (server-side) — no public access
ALTER TABLE login_security ENABLE ROW LEVEL SECURITY;
-- No RLS policies = public/anon cannot read or write
