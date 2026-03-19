-- ============================================================
-- Your Gear Advisor – pełny schemat bazy danych
-- Uruchom w: Supabase Dashboard → SQL Editor
-- ============================================================

-- Rozszerzenie pgvector (wymagane dla embeddingów 1536 dim)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- TABELA: gear_items_raw
-- Etap Discovery: surowe URL-e i zescrapowane dane
-- ============================================================
CREATE TABLE IF NOT EXISTS gear_items_raw (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store         text NOT NULL,                    -- 'thomann' | 'gear4music'
  product_url   text UNIQUE NOT NULL,             -- URL produktu (unikalny klucz)
  name_raw      text,
  description_raw text,
  image_url_raw text,
  price_raw     numeric,
  category_raw  text,
  sku_raw       text,
  ean_raw       text,
  processed     boolean DEFAULT false,            -- true = scraper wypełnił dane
  processed_at  timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ============================================================
-- TABELA: gear_items
-- Wzbogacone produkty z embeddingiem pgvector (1536 dim)
-- ============================================================
CREATE TABLE IF NOT EXISTS gear_items (
  id          uuid PRIMARY KEY REFERENCES gear_items_raw(id) ON DELETE CASCADE,
  name        text,
  brand       text,
  type        text,   -- 'electric_guitar' | 'acoustic_guitar' | 'classical_guitar' | 'bass_guitar' | 'pedal' | 'amp' | 'accessory' | 'other'
  tags        text[],
  description text,
  image_url   text,
  price       numeric,
  product_url text,
  embedding   vector(1536),
  ai_profile  jsonb,  -- { styles, tone, use_cases, features, level, colors }
  created_at  timestamptz DEFAULT now()
);

-- Indeks IVFFlat dla cosine similarity search
CREATE INDEX IF NOT EXISTS gear_items_embedding_idx
  ON gear_items USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- TABELA: gear_price_history
-- Historia cen – sanity check: price > 0
-- ============================================================
CREATE TABLE IF NOT EXISTS gear_price_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gear_id     uuid REFERENCES gear_items(id) ON DELETE CASCADE,
  price       numeric NOT NULL CHECK (price > 0),
  store       text,
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gear_price_history_gear_id_idx
  ON gear_price_history (gear_id, recorded_at DESC);

-- ============================================================
-- TABELA: jobs
-- Kolejka jobów do generowania AI reasoning
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL,          -- 'generate_reasoning'
  query       text,
  query_hash  text,
  product_id  uuid REFERENCES gear_items(id) ON DELETE CASCADE,
  processed   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jobs_unprocessed_idx
  ON jobs (processed, created_at) WHERE processed = false;

-- ============================================================
-- TABELA: ai_match_reasons
-- Cache wygenerowanych reasoningów AI per zapytanie + produkt
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_match_reasons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash  text NOT NULL,
  product_id  uuid REFERENCES gear_items(id) ON DELETE CASCADE,
  reason      text,
  created_at  timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_match_reasons_unique_idx
  ON ai_match_reasons (query_hash, product_id);

-- ============================================================
-- FUNKCJA RPC: match_gear_items
-- Semantic similarity search z opcjonalnym filtrem ceny
-- Używana przez lib/similarity.ts
-- ============================================================
CREATE OR REPLACE FUNCTION match_gear_items(
  query_embedding vector(1536),
  match_threshold float,
  match_count     int,
  min_price       float DEFAULT NULL,
  max_price       float DEFAULT NULL
)
RETURNS TABLE (
  id          uuid,
  name        text,
  brand       text,
  type        text,
  tags        text[],
  description text,
  image_url   text,
  price       numeric,
  product_url text,
  ai_profile  jsonb,
  similarity  float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.brand,
    g.type,
    g.tags,
    g.description,
    g.image_url,
    g.price,
    g.product_url,
    g.ai_profile,
    1 - (g.embedding <=> query_embedding) AS similarity
  FROM gear_items g
  WHERE
    g.embedding IS NOT NULL
    AND 1 - (g.embedding <=> query_embedding) > match_threshold
    AND (min_price IS NULL OR g.price >= min_price)
    AND (max_price IS NULL OR g.price <= max_price)
  ORDER BY g.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
