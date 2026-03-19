// scripts/importG4MFromCSV.ts
// Importuje URL-e produktów Gear4Music z pliku g4m_products_wybrane.csv do gear_items_raw
// Uruchom: npm run import-g4m-csv [limit]
// Domyślny limit: 300 (bezpieczna porcja). Uruchamiaj wielokrotnie aż do wyczerpania pliku.

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.resolve(__dirname, "../g4m_products_wybrane.csv");
const LIMIT = parseInt(process.argv[2] ?? "300", 10);
const BATCH_SIZE = 100;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function parseCSV(content: string): { id: string; name: string; url: string }[] {
  const results: { id: string; name: string; url: string }[] = [];
  for (const rawLine of content.trim().split("\n")) {
    const line = rawLine.trim().replace(/^"|"$/g, "");
    const parts = line.split(',""');
    if (parts.length < 3) continue;
    results.push({
      id: parts[0],
      name: parts[1].replace(/""/g, ""),
      url: parts[2].replace(/""/g, "").replace(/"$/, ""),
    });
  }
  return results;
}

async function run() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Plik CSV nie istnieje: ${CSV_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const allRows = parseCSV(content);
  console.log(`CSV: ${allRows.length} produktów łącznie`);
  console.log(`Limit tej partii: ${LIMIT}\n`);

  // Pobierz URL-e już istniejące w gear_items_raw
  const { data: rawExisting, error: rawErr } = await supabase
    .from("gear_items_raw")
    .select("product_url")
    .eq("store", "gear4music");
  if (rawErr) throw new Error(`gear_items_raw select: ${rawErr.message}`);
  const existingRaw = new Set((rawExisting ?? []).map((r: any) => r.product_url));
  console.log(`Już w gear_items_raw (gear4music): ${existingRaw.size}`);

  // Pobierz URL-e już istniejące w gear_items (w pełni przetworzone)
  const { data: enrichedExisting, error: enrichErr } = await supabase
    .from("gear_items")
    .select("product_url");
  if (enrichErr) throw new Error(`gear_items select: ${enrichErr.message}`);
  const existingEnriched = new Set((enrichedExisting ?? []).map((r: any) => r.product_url));
  console.log(`Już w gear_items (gear4music): ${existingEnriched.size}`);

  // Filtruj nowe URL-e
  const newRows = allRows.filter(
    (r) => !existingRaw.has(r.url) && !existingEnriched.has(r.url)
  );
  console.log(`Nowych (jeszcze nie w bazie): ${newRows.length}`);

  const batch = newRows.slice(0, LIMIT);
  console.log(`Do wstawienia w tej partii: ${batch.length}\n`);

  if (batch.length === 0) {
    console.log("Brak nowych URL-i do wstawienia. Wszystkie już są w bazie.");
    return;
  }

  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE);
    const rows = chunk.map((r) => ({
      store: "gear4music",
      product_url: r.url,
      processed: false,
    }));

    const { error } = await supabase
      .from("gear_items_raw")
      .upsert(rows, { onConflict: "product_url", ignoreDuplicates: true });

    if (error) {
      console.error(`Błąd batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      failed += chunk.length;
    } else {
      inserted += chunk.length;
    }

    const progress = Math.min(i + BATCH_SIZE, batch.length);
    process.stdout.write(`\rPostęp: ${progress}/${batch.length}`);
  }

  console.log(`\n\n=== GOTOWE ===`);
  console.log(`  Wstawionych: ${inserted}`);
  if (failed > 0) console.log(`  Błędów: ${failed}`);
  console.log(`  Pozostało w CSV (jeszcze nie w bazie): ${Math.max(0, newRows.length - batch.length)}`);
  console.log(`\nNastępny krok: curl.exe -X POST http://localhost:4100/api/scrape/run`);
}

run().catch((err) => {
  console.error("KRYTYCZNY:", err);
  process.exit(1);
});
