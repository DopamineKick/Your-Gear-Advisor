-- Dodaje kolumnę active do gear_items
-- Pozwala na tymczasowe ukrycie produktów z danego sklepu jednym UPDATE

ALTER TABLE gear_items
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS gear_items_active_idx ON gear_items (active);

-- Aktualizacja funkcji RPC match_gear_items — filtruje nieaktywne produkty
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
    g.active = true
    AND g.embedding IS NOT NULL
    AND 1 - (g.embedding <=> query_embedding) > match_threshold
    AND (min_price IS NULL OR g.price >= min_price)
    AND (max_price IS NULL OR g.price <= max_price)
  ORDER BY g.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
