// scripts/runPipeline.ts
// Master pipeline — uruchamia cały pipeline bez ingerencji użytkownika
// Użycie: npm run pipeline
//
// Kolejność:
//   1. npm run embeddings   — embeddingi dla produktów po re-enrichmencie
//   2. runScrapeStandalone  — scraping WSZYSTKICH unprocessed G4M/Thomann
//   3. runEnrich            — AI enrichment nowych produktów
//   4. npm run embeddings   — embeddingi dla nowych produktów

import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback na .env

const supabase = createClient(
  (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function run(label: string, cmd: string) {
  const start = Date.now();
  console.log("\n" + "=".repeat(60));
  console.log(`▶  ${label}`);
  console.log(`   $ ${cmd}`);
  console.log("=".repeat(60));

  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`\n✅ ${label} — zakończono (${elapsed}s)`);
  } catch (err: any) {
    console.error(`\n❌ BŁĄD w kroku: ${label}`);
    console.error(err?.message ?? err);
    process.exit(1);
  }
}

async function checkUnprocessed(): Promise<number> {
  const { count, error } = await supabase
    .from("gear_items_raw")
    .select("id", { count: "exact", head: true })
    .in("store", ["gear4music", "thomann"])
    .or("processed.is.null,processed.eq.false");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function main() {
  const pipelineStart = Date.now();

  console.log("\n" + "=".repeat(60));
  console.log("🚀 YOUR GEAR ADVISOR — FULL PIPELINE START");
  console.log(`   ${new Date().toLocaleString("pl-PL")}`);
  console.log("=".repeat(60));

  // --- KROK 1: Embeddingi dla produktów po re-enrichmencie ---
  run(
    "KROK 1/4 — Embeddingi (po re-enrichmencie)",
    "npx ts-node scripts/generateEmbeddings.ts"
  );

  // --- KROK 2: Scraping G4M / Thomann ---
  const unprocessed = await checkUnprocessed();
  if (unprocessed > 0) {
    console.log(`\n📊 Unprocessed w gear_items_raw: ${unprocessed}`);
    run(
      `KROK 2/4 — Scraping (${unprocessed} produktów)`,
      "npx ts-node -P tsconfig.scripts.json scripts/runScrapeStandalone.ts"
    );
  } else {
    console.log("\n⏭  KROK 2/4 — Scraping: brak produktów do przetworzenia, pomijam.");
  }

  // --- KROK 3: AI Enrichment nowych produktów ---
  run(
    "KROK 3/4 — AI Enrichment nowych produktów",
    "npx ts-node --esm scripts/runEnrich.ts"
  );

  // --- KROK 4: Embeddingi dla nowych produktów ---
  run(
    "KROK 4/4 — Embeddingi (po enrichmencie G4M)",
    "npx ts-node scripts/generateEmbeddings.ts"
  );

  const totalElapsed = Math.round((Date.now() - pipelineStart) / 1000 / 60);

  console.log("\n" + "=".repeat(60));
  console.log("🏁 PIPELINE ZAKOŃCZONY POMYŚLNIE");
  console.log(`   Całkowity czas: ~${totalElapsed} minut`);
  console.log(`   ${new Date().toLocaleString("pl-PL")}`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("\nFATAL PIPELINE ERROR:", err);
  process.exit(1);
});
