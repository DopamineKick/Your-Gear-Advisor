-- ============================================================
-- Your Gear Advisor – Likes, Tags & Search
-- Uruchom w: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- KOLUMNA: posts.tags (tablica tekstowa)
-- ============================================================
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS posts_tags_gin_idx ON posts USING GIN (tags);

-- ============================================================
-- TABELA: post_likes
-- Like pod postem — jeden user = jeden like, bez możliwości cofnięcia
-- ============================================================
CREATE TABLE IF NOT EXISTS post_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS post_likes_post_idx ON post_likes (post_id);
CREATE INDEX IF NOT EXISTS post_likes_user_idx ON post_likes (user_id);

-- ============================================================
-- TABELA: comment_likes
-- Like pod komentarzem — jeden user = jeden like, bez możliwości cofnięcia
-- ============================================================
CREATE TABLE IF NOT EXISTS comment_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS comment_likes_comment_idx ON comment_likes (comment_id);
CREATE INDEX IF NOT EXISTS comment_likes_user_idx ON comment_likes (user_id);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- post_likes: zalogowani mogą czytać wszystkie, dodawać własne
CREATE POLICY "post_likes_select_auth" ON post_likes
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "post_likes_insert_own" ON post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- comment_likes: zalogowani mogą czytać wszystkie, dodawać własne
CREATE POLICY "comment_likes_select_auth" ON comment_likes
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "comment_likes_insert_own" ON comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Full-text search index na posts (title + content)
-- ============================================================
CREATE INDEX IF NOT EXISTS posts_fts_idx ON posts
  USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')));
