import { createClient } from "@supabase/supabase-js";

export interface SimilarityOptions {
  minPrice?: number;
  maxPrice?: number;
  types?: string[]; // filtr typów instrumentów przekazywany do SQL (bass_guitar, amp, pedal, etc.)
}

export async function findSimilarGear(
  queryEmbedding: number[],
  options: SimilarityOptions = {}
) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const params: Record<string, unknown> = {
    query_embedding: queryEmbedding,
    match_threshold: 0.25,
    match_count: 100,
  };

  if (options.minPrice != null) params.min_price = options.minPrice;
  if (options.maxPrice != null) params.max_price = options.maxPrice;
  if (options.types?.length) params.p_types = options.types;

  const { data, error } = await supabase.rpc("match_gear_items", params);

  if (error) throw error;

  // Fallback: jeśli brak wyników z progiem, spróbuj bez progu (zachowaj filtr typów)
  if (!data || data.length === 0) {
    const fallbackParams: Record<string, unknown> = {
      query_embedding: queryEmbedding,
      match_threshold: 0.0,
      match_count: 30,
    };
    if (options.minPrice != null) fallbackParams.min_price = options.minPrice;
    if (options.maxPrice != null) fallbackParams.max_price = options.maxPrice;
    if (options.types?.length) fallbackParams.p_types = options.types;

    const { data: fallbackData, error: fallbackError } = await supabase.rpc(
      "match_gear_items",
      fallbackParams
    );

    if (fallbackError) throw fallbackError;
    return fallbackData ?? [];
  }

  return data;
}
