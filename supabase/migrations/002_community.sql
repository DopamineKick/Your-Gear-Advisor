-- ============================================================
-- Your Gear Advisor – Community schema
-- Uruchom w: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- TABELA: profiles
-- Nick użytkownika, flagi admin/bot, konfiguracja bota
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nick           text UNIQUE NOT NULL,
  avatar_url     text,
  bio            text,
  is_admin       boolean NOT NULL DEFAULT false,
  is_bot         boolean NOT NULL DEFAULT false,
  bot_config     jsonb DEFAULT NULL,
  -- Czas następnej akcji bota (cron scheduler)
  next_post_at   timestamptz DEFAULT NULL,
  next_reply_at  timestamptz DEFAULT NULL,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_nick_idx ON profiles (nick);
CREATE INDEX IF NOT EXISTS profiles_is_bot_idx ON profiles (is_bot) WHERE is_bot = true;

-- ============================================================
-- TABELA: posts
-- Posty na forum – wymagają moderacji (status=pending → approved)
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  content     text NOT NULL,
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_status_created_idx ON posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_author_idx ON posts (author_id);

-- ============================================================
-- TABELA: comments
-- Komentarze – moderacja przez OpenAI (auto-approve lub flag)
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     text NOT NULL,
  status      text NOT NULL DEFAULT 'approved'
                CHECK (status IN ('approved', 'flagged', 'deleted')),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments (post_id, created_at ASC);

-- ============================================================
-- TABELA: bot_activity_log
-- Log działań botów (posty, komentarze, ręczne wpisy)
-- ============================================================
CREATE TABLE IF NOT EXISTS bot_activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('post', 'comment', 'manual_post', 'manual_comment')),
  target_id   uuid DEFAULT NULL,  -- post_id dla komentarzy
  content     text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_log_bot_id_idx ON bot_activity_log (bot_id, created_at DESC);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_activity_log ENABLE ROW LEVEL SECURITY;

-- profiles: wszyscy mogą czytać, każdy może tworzyć własny, aktualizować własny
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- posts: zatwierdzone widoczne dla wszystkich, zalogowani mogą tworzyć
CREATE POLICY "posts_select_approved" ON posts FOR SELECT
  USING (status = 'approved' OR auth.uid() = author_id);
CREATE POLICY "posts_insert_auth" ON posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- comments: zatwierdzone widoczne dla wszystkich, zalogowani mogą tworzyć
CREATE POLICY "comments_select_approved" ON comments FOR SELECT
  USING (status = 'approved');
CREATE POLICY "comments_insert_auth" ON comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- bot_activity_log: tylko service role (brak polityk dla anon/user = deny all)
-- service role key omija RLS automatycznie
