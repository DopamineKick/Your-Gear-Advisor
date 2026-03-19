// scripts/importGear4MusicSitemap.ts
// Pobiera sitemapę Gear4Music i wstawia URL-e produktów gitarowych do gear_items_raw
// Uruchom: npm run import-g4m

import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const SITEMAP_URL =
  "https://www.gear4music.pl/sitemaps/pl/pl/sitemap-guitar_bass.xml";

const LIMIT = parseInt(process.argv[2] ?? "20", 10);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log(`Fetching sitemap: ${SITEMAP_URL}`);
  console.log(`Limit: ${LIMIT} nowych URL-i\n`);

  // G4M blokuje prosty fetch — potrzebny pełny browser
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });

  const response = await page.goto(SITEMAP_URL, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  if (!response || response.status() >= 400) {
    await browser.close();
    throw new Error(`Sitemap fetch failed: HTTP ${response?.status()}`);
  }

  const xml = await page.content();
  await browser.close();
  console.log(`Sitemap pobrany — rozmiar: ${xml.length} znaków`);

  // Parsuj bloki <url>
  const urlBlocks = Array.from(xml.matchAll(/<url>([\s\S]*?)<\/url>/g));
  console.log(`Znalezione bloki <url>: ${urlBlocks.length}`);

  const productUrls: string[] = [];

  for (const block of urlBlocks) {
    const content = block[1];
    const locMatch = content.match(/<loc>(.*?)<\/loc>/);
    const priorityMatch = content.match(/<priority>(.*?)<\/priority>/);

    if (!locMatch || !priorityMatch) continue;

    const url = locMatch[1].trim();
    const priority = parseFloat(priorityMatch[1].trim());

    // priority=0.6 oznacza strony produktowe w G4M
    if (priority === 0.6) {
      productUrls.push(url);
    }
  }

  console.log(`Produkty (priority=0.6): ${productUrls.length}`);

  // Pobierz URL-e już istniejące w bazie
  const { data: existing, error: selectError } = await supabase
    .from("gear_items_raw")
    .select("product_url")
    .eq("store", "gear4music");

  if (selectError) {
    throw new Error(`Błąd odczytu gear_items_raw: ${selectError.message}`);
  }

  const existingUrls = new Set((existing ?? []).map((r: any) => r.product_url));
  console.log(`Już w bazie (gear4music): ${existingUrls.size}`);

  const newUrls = productUrls
    .filter((url) => !existingUrls.has(url))
    .slice(0, LIMIT);

  console.log(`Nowe URL-e do wstawienia: ${newUrls.length}\n`);

  if (newUrls.length === 0) {
    console.log("Brak nowych URL-i. Wszystkie już są w bazie.");
    return;
  }

  let inserted = 0;

  for (const url of newUrls) {
    const { error } = await supabase.from("gear_items_raw").insert({
      store: "gear4music",
      product_url: url,
      processed: false,
    });

    if (error) {
      console.error(`[BŁĄD] ${url}: ${error.message}`);
    } else {
      inserted++;
      console.log(`[${inserted}/${newUrls.length}] Wstawiony: ${url}`);
    }
  }

  console.log(`\n=== GOTOWE === Wstawionych: ${inserted}/${newUrls.length}`);
}

run().catch((err) => {
  console.error("KRYTYCZNY:", err);
  process.exit(1);
});
