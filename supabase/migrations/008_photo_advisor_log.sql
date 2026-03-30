-- Photo advisor usage log (rate limiting)
CREATE TABLE IF NOT EXISTS photo_advisor_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient rate-limit queries
CREATE INDEX IF NOT EXISTS idx_photo_advisor_log_user_date
  ON photo_advisor_log (user_id, created_at DESC);

-- RLS
ALTER TABLE photo_advisor_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own log entries
CREATE POLICY "photo_advisor_log_select_own"
  ON photo_advisor_log FOR SELECT
  USING (auth.uid() = user_id);

-- Insert allowed for authenticated users (own entries only)
CREATE POLICY "photo_advisor_log_insert_own"
  ON photo_advisor_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (used by API with service key)
-- No additional policy needed — service role bypasses RLS
