// scripts/importThomannCSV.ts
// Importuje URL-e produktów Thomanna z CSV do tabeli gear_items_raw
// Uruchom: npm run import-csv

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CSV_PATH = path.resolve(__dirname, "../thomann-filter/guitar_products.csv");
const BATCH_SIZE = 100;

async function run() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Plik CSV nie istnieje: ${CSV_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);

  // Pierwsza linia to nagłówek "url"
  const header = lines[0].toLowerCase();
  if (!header.includes("url")) {
    console.error("CSV nie zawiera kolumny 'url'. Nagłówek:", header);
    process.exit(1);
  }

  const urls = lines.slice(1).filter((l) => l.startsWith("http"));
  console.log(`Znaleziono ${urls.length} URL-i w CSV.`);

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const rows = batch.map((url) => ({
      store: "thomann",
      product_url: url,
      processed: false,
    }));

    const { error } = await supabase
      .from("gear_items_raw")
      .upsert(rows, { onConflict: "product_url", ignoreDuplicates: true });

    if (error) {
      console.error(`Błąd przy batch ${i / BATCH_SIZE + 1}:`, error.message);
    } else {
      inserted += batch.length;
    }

    const progress = Math.min(i + BATCH_SIZE, urls.length);
    process.stdout.write(`\rPostęp: ${progress}/${urls.length}`);
  }

  console.log(`\n\nZakończono.`);
  console.log(`  Wstawionych/zaktualizowanych: ~${inserted}`);
  console.log(`  Sprawdź gear_items_raw w Supabase Dashboard.`);
}

run().catch((err) => {
  console.error("Błąd:", err);
  process.exit(1);
});
