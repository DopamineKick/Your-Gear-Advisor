// lib/enrichment/enrichBatch.ts
import { createClient } from "@supabase/supabase-js";
import { enrichItem } from "@/lib/enrichment/enrichItem"; // ABSOLUTNY IMPORT

export async function enrichBatch() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  console.log("=== enrichBatch START ===");

  // Pobierz RAW — tylko przetworzone przez scraper (processed=true)
  const { data: rawItems, error: rawError } = await supabase
    .from("gear_items_raw")
    .select("*")
    .eq("processed", true);

  if (rawError) {
    console.error("RAW ERROR:", rawError);
    throw rawError;
  }

  // Pobierz istniejące ID
  const { data: enrichedItems, error: enrichedError } = await supabase
    .from("gear_items")
    .select("id");

  if (enrichedError) {
    console.error("ENRICHED ERROR:", enrichedError);
    throw enrichedError;
  }

  const enrichedIds = new Set(enrichedItems.map((i) => i.id));

  // Filtruj
  const toProcess = rawItems.filter((item) => !enrichedIds.has(item.id));

  console.log(`Enriching ${toProcess.length} items...`);

  let success = 0;
  let failed = 0;

  for (const item of toProcess) {
    try {
      await enrichItem(item);
      success++;
      console.log(`[${success}/${toProcess.length}] Enriched: ${item.name_raw}`);
    } catch (err: any) {
      failed++;
      console.error(`[FAIL] ${item.name_raw} (${item.id}): ${err?.message ?? err}`);
    }
  }

  console.log(`=== enrichBatch END === success:${success} failed:${failed}`);

  return { count: toProcess.length, success, failed };
}
