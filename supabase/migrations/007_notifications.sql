-- ============================================================
-- Your Gear Advisor – System Powiadomień
-- Uruchom w: Supabase Dashboard → SQL Editor
-- ============================================================

-- Threading w komentarzach (parent_id)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES comments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON comments (parent_id) WHERE parent_id IS NOT NULL;

-- ============================================================
-- TABELA: notifications
-- Powiadomienia osobiste: wzmianki, odpowiedzi, wiadomości od admina
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('mention', 'reply', 'admin_message')),
  content     text,
  post_id     uuid REFERENCES posts(id) ON DELETE CASCADE,
  from_nick   text,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx
  ON notifications (user_id, is_read, created_at DESC);

-- ============================================================
-- TABELA: admin_broadcasts
-- Komunikaty admina wysyłane do wszystkich użytkowników
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- TABELA: admin_broadcast_reads
-- Śledzenie, który użytkownik przeczytał dany broadcast
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_broadcast_reads (
  broadcast_id  uuid NOT NULL REFERENCES admin_broadcasts(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at       timestamptz DEFAULT now(),
  PRIMARY KEY (broadcast_id, user_id)
);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_broadcast_reads ENABLE ROW LEVEL SECURITY;

-- notifications: user czyta i aktualizuje tylko swoje
CREATE POLICY "notif_select_own" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
-- service role (backend) może insertować powiadomienia dla innych
CREATE POLICY "notif_insert_service" ON notifications
  FOR INSERT WITH CHECK (true);

-- admin_broadcasts: każdy zalogowany może czytać
CREATE POLICY "broadcasts_read_auth" ON admin_broadcasts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- admin_broadcast_reads: user zarządza tylko swoimi odczytami
CREATE POLICY "bc_reads_select_own" ON admin_broadcast_reads
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bc_reads_insert_own" ON admin_broadcast_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);
