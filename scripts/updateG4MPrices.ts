// scripts/updateG4MPrices.ts
// Aktualizuje ceny produktów Gear4Music w gear_items (bez re-enrichmentu AI)
// Uruchom: npx ts-node --esm scripts/updateG4MPrices.ts [limit]
//
// Domyślnie przetwarza wszystkie G4M produkty (batch po BATCH_SIZE).
// Opcjonalny argument: limit liczby produktów, np. "50"

import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const BATCH_SIZE = 20;
const DELAY_MS = 2000;
const LIMIT = parseInt(process.argv[2] ?? "0", 10); // 0 = brak limitu

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Parsuj polską cenę: "5.623,90 zł" → 5623.90, "943,90 zł" → 943.90
function parsePolishPrice(text: string): number | null {
  let clean = text.replace(/[^\d,.]/g, "");
  if (!clean) return null;
  if (/\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(clean)) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else {
    clean = clean.replace(",", ".");
  }
  const parsed = parseFloat(clean);
  return Number.isNaN(parsed) ? null : parsed;
}

async function scrapePrice(
  page: import("playwright").Page,
  url: string
): Promise<number | null> {
  try {
    await page.setExtraHTTPHeaders({
      "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.1",
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    const price = await page.evaluate(() => {
      const parsePolishPriceInBrowser = (text: string): number | null => {
        let clean = text.replace(/[^\d,.]/g, "");
        if (!clean) return null;
        if (/\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(clean)) {
          clean = clean.replace(/\./g, "").replace(",", ".");
        } else {
          clean = clean.replace(",", ".");
        }
        const parsed = parseFloat(clean);
        return Number.isNaN(parsed) ? null : parsed;
      };

      // 1. JSON-LD
      const ldScripts = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      );
      for (const script of ldScripts) {
        try {
          const data = JSON.parse(script.textContent || "");
          const offers =
            data?.offers ??
            (data?.["@graph"] ?? []).find((n: any) => n?.offers)?.offers;
          const offer = Array.isArray(offers) ? offers[0] : offers;
          if (offer?.priceCurrency === "PLN" && offer?.price) {
            const p = parseFloat(String(offer.price));
            if (!Number.isNaN(p) && p > 0) return p;
          }
        } catch {
          /* ignoruj */
        }
      }

      // 2. Meta tagi
      const metaSelectors = [
        "meta[property='product:price:amount']",
        "meta[itemprop='price']",
        "meta[property='og:price:amount']",
      ];
      for (const sel of metaSelectors) {
        const el = document.querySelector<HTMLMetaElement>(sel);
        const val = el?.getAttribute("content");
        if (val) {
          const p = parseFloat(val.replace(",", "."));
          if (!Number.isNaN(p) && p > 0) return p;
        }
      }

      // 3. DOM z "zł"
      const priceSelectors = [
        ".price",
        ".product-price",
        ".pdp-price",
        "[data-product-price]",
        "[itemprop='price']",
      ];
      for (const sel of priceSelectors) {
        const el = document.querySelector<HTMLElement>(sel);
        const text = el?.textContent?.trim() || "";
        if (text && (text.includes("zł") || /^\d[\d\s.,]+$/.test(text))) {
          return parsePolishPriceInBrowser(text);
        }
      }

      return null;
    });

    return price;
  } catch (err) {
    console.error(`  [BŁĄD scraping] ${url}:`, (err as Error).message);
    return null;
  }
}

async function run() {
  console.log("=== updateG4MPrices.ts ===");
  console.log(`Limit: ${LIMIT === 0 ? "brak (wszystkie)" : LIMIT}`);
  console.log(`Batch: ${BATCH_SIZE}, opóźnienie: ${DELAY_MS}ms\n`);

  // Pobierz wszystkie G4M produkty z gear_items
  let query = supabase
    .from("gear_items")
    .select("id, name, price, product_url")
    .ilike("product_url", "%gear4music%")
    .order("created_at", { ascending: true });

  if (LIMIT > 0) query = query.limit(LIMIT);

  const { data: items, error } = await query;

  if (error) {
    console.error("Błąd pobierania gear_items:", error.message);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.log("Brak produktów G4M w gear_items.");
    return;
  }

  console.log(`Znaleziono ${items.length} produktów G4M do aktualizacji.\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const url = item.product_url as string;
    const oldPrice = item.price as number | null;

    process.stdout.write(
      `[${i + 1}/${items.length}] ${(item.name as string).slice(0, 50)} ... `
    );

    if (!url) {
      console.log("SKIP (brak URL)");
      skipped++;
      continue;
    }

    const newPrice = await scrapePrice(page, url);

    if (newPrice === null || newPrice <= 0) {
      console.log(`FAIL (nie znaleziono ceny)`);
      failed++;
    } else if (newPrice === oldPrice) {
      console.log(`OK (bez zmian: ${newPrice} zł)`);
      skipped++;
    } else {
      // Aktualizuj gear_items.price
      const { error: updateErr } = await supabase
        .from("gear_items")
        .update({ price: newPrice })
        .eq("id", item.id);

      if (updateErr) {
        console.log(`FAIL update: ${updateErr.message}`);
        failed++;
      } else {
        // Zapisz do gear_price_history
        await supabase.from("gear_price_history").insert({
          gear_id: item.id,
          price: newPrice,
          currency: "PLN",
          recorded_at: new Date().toISOString(),
        });

        console.log(`ZAKTUALIZOWANO: ${oldPrice ?? "?"} → ${newPrice} zł`);
        updated++;
      }
    }

    // Opóźnienie między requestami (nie na ostatnim)
    if (i < items.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  await browser.close();

  console.log("\n=== GOTOWE ===");
  console.log(`Zaktualizowano:  ${updated}`);
  console.log(`Bez zmian/skip:  ${skipped}`);
  console.log(`Błędy:           ${failed}`);
  console.log(`Łącznie:         ${items.length}`);
}

run().catch((err) => {
  console.error("KRYTYCZNY:", err);
  process.exit(1);
});
