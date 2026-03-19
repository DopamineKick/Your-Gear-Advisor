// scripts/runScrapeStandalone.ts
// Standalone scraper — nie wymaga serwera Next.js
// Przetwarza WSZYSTKIE unprocessed produkty z gear_items_raw (G4M + Thomann)
// Restartuje przeglądarkę co BROWSER_RESTART_EVERY produktów (ochrona pamięci)

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback na .env

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { scrapeProductPage } from "../lib/scraper/scrapeProductPage";

const supabase = createClient(
  (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FETCH_BATCH = 50;            // ile URL-i pobieramy z bazy naraz
const BROWSER_RESTART_EVERY = 500; // restart przeglądarki co N produktów
const PRODUCT_TIMEOUT_MS = 50000;  // max czas na jeden produkt (kill-safe)

async function fetchBatch() {
  const { data, error } = await supabase
    .from("gear_items_raw")
    .select("id, product_url, store")
    .in("store", ["gear4music", "thomann"])
    .or("processed.is.null,processed.eq.false")
    .order("created_at", { ascending: true })
    .limit(FETCH_BATCH);

  if (error) throw new Error(`[SCRAPE] Błąd pobierania: ${error.message}`);
  return data ?? [];
}

async function newPage(browser: import("playwright").Browser) {
  return browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    extraHTTPHeaders: { "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8" },
  });
}

/** Uruchamia scrapeProductPage z twardym limitem czasu.
 *  Jeśli przekroczy PRODUCT_TIMEOUT_MS → rzuca błąd i strona musi być odświeżona. */
async function scrapeWithTimeout(
  page: import("playwright").Page,
  url: string,
  store: string
) {
  return Promise.race([
    scrapeProductPage(page, url, store),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Twardy timeout ${PRODUCT_TIMEOUT_MS / 1000}s przekroczony`)),
        PRODUCT_TIMEOUT_MS
      )
    ),
  ]);
}

async function main() {
  console.log("=".repeat(60));
  console.log("🚀 SCRAPER STANDALONE — START");
  console.log("=".repeat(60));

  let totalProcessed = 0;
  let sinceBrowserRestart = 0;

  let browser = await chromium.launch({ headless: true });
  let page = await newPage(browser);

  try {
    while (true) {
      // Restart przeglądarki co BROWSER_RESTART_EVERY produktów
      if (sinceBrowserRestart >= BROWSER_RESTART_EVERY) {
        console.log(`\n🔄 Restart przeglądarki po ${sinceBrowserRestart} produktach...`);
        await browser.close();
        browser = await chromium.launch({ headless: true });
        page = await newPage(browser);
        sinceBrowserRestart = 0;
        console.log("✅ Przeglądarka zrestartowana.\n");
      }

      const items = await fetchBatch();

      if (items.length === 0) {
        console.log("\n✅ Brak produktów do przetworzenia. Scraping zakończony.");
        break;
      }

      console.log(`\n📦 Batch: ${items.length} produktów (łącznie: ${totalProcessed})`);

      for (const item of items) {
        const url = item.product_url as string;
        const id = item.id as string;
        const store = (item.store as string)?.toLowerCase();

        try {
          const data = await scrapeWithTimeout(page, url, store);

          if (!data) {
            console.warn(`  ⚠️  Brak danych: ${url}`);
            await supabase
              .from("gear_items_raw")
              .update({ processed: true, processed_at: new Date().toISOString() })
              .eq("id", id);
            continue;
          }

          const { error: updateError } = await supabase
            .from("gear_items_raw")
            .update({
              name_raw: data.name_raw,
              description_raw: data.description_raw,
              image_url_raw: data.image_url_raw,
              price_raw: data.price_raw,
              category_raw: data.category_raw,
              sku_raw: data.sku_raw,
              ean_raw: data.ean_raw,
              processed: true,
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);

          if (updateError) {
            console.error(`  ❌ Update error dla ${url}: ${updateError.message}`);
          } else {
            totalProcessed++;
            sinceBrowserRestart++;
            console.log(`  ✅ [${totalProcessed}] ${store}: ${url}`);
          }
        } catch (err: any) {
          console.error(`  ❌ Błąd scrapowania ${url}: ${err?.message ?? err}`);
          // Oznacz jako processed żeby nie blokować pętli
          await supabase
            .from("gear_items_raw")
            .update({ processed: true, processed_at: new Date().toISOString() })
            .eq("id", id);
          // Reset strony — po timeout/crash Playwright page jest w złym stanie
          try { await page.close(); } catch { /* ignoruj */ }
          page = await newPage(browser);
        }
      }
    }
  } finally {
    await browser.close();
  }

  console.log("\n" + "=".repeat(60));
  console.log(`🏁 SCRAPER ZAKOŃCZONY — przetworzono: ${totalProcessed} produktów`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
