-- Migracja 005 — seq scan workaround dla Supabase free tier
--
-- Problem: IVFFlat zbudowany na pustej tabeli (migracja 001) → złe centroidy → gorszy niż seq scan
-- Problem: Supabase free tier maintenance_work_mem = 32 MB → nie można przebudować IVFFlat (64 MB)
--          ani HNSW (~42 MB potrzebne na wektory)
--
-- Rozwiązanie: SET LOCAL enable_indexscan = off → wymusza seq scan
-- Seq scan 6800 × 1536 dim ≈ 50-200ms < 8s timeout Supabase → działa
--
-- Docelowo (Supabase paid): DROP INDEX + CREATE INDEX USING hnsw z właściwymi danymi
--
-- Sygnatura 6-param (ta sama co migracja 004)
CREATE OR REPLACE FUNCTION match_gear_items(
  query_embedding vector(1536),
  match_threshold float,
  match_count     int,
  min_price       float DEFAULT NULL,
  max_price       float DEFAULT NULL,
  p_types         text[] DEFAULT NULL
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
  -- Wymuś seq scan: IVFFlat zbudowany na pustej tabeli jest gorszy niż seq scan
  -- Dla 6800 produktów seq scan (~42 MB) jest szybki i deterministyczny
  SET LOCAL enable_indexscan = off;
  SET LOCAL enable_bitmapscan = off;

  RETURN QUERY
  SELECT
    g.id, g.name, g.brand, g.type, g.tags, g.description,
    g.image_url, g.price, g.product_url, g.ai_profile,
    1 - (g.embedding <=> query_embedding) AS similarity
  FROM gear_items g
  WHERE
    g.active = true
    AND g.embedding IS NOT NULL
    AND 1 - (g.embedding <=> query_embedding) > match_threshold
    AND (min_price IS NULL OR g.price >= min_price)
    AND (max_price IS NULL OR g.price <= max_price)
    AND (p_types IS NULL OR g.type = ANY(p_types))
  ORDER BY g.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
