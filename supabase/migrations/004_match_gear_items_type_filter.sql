-- Dodaje filtr typów do match_gear_items
-- Umożliwia wyszukiwanie tylko w obrębie podanych typów instrumentów (bass_guitar, amp, pedal, etc.)
-- Filtrowanie na poziomie DB jest efektywniejsze niż post-filtering w kodzie TS
--
-- WAŻNE: DROP starej 5-param wersji żeby uniknąć przeciążenia — PostgREST nie obsługuje overloadów
DROP FUNCTION IF EXISTS match_gear_items(vector(1536), double precision, integer, double precision, double precision);

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
    AND (p_types IS NULL OR g.type = ANY(p_types))
  ORDER BY g.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
