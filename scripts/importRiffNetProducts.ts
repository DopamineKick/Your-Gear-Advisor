// scripts/importRiffNetProducts.ts
// Importuje produkty z riff.net.pl przez strony kategorii (DataLayer + article tagi)
// Uruchom: npx ts-node scripts/importRiffNetProducts.ts [maxPagesPerCategory]

import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

// ── Konfiguracja ─────────────────────────────────────────────────────────────
const CATEGORY_URLS = [
  "https://riff.net.pl/1864-gitary-elektryczne",
  "https://riff.net.pl/1868-gitary-akustyczne-i-elektroakustyczne",
  "https://riff.net.pl/1867-gitary-klasyczne-i-elektroklasyczne",
  "https://riff.net.pl/1869-gitary-basowe",
  "https://riff.net.pl/1873-wzmacniacze-do-gitary-elektrycznej",
  "https://riff.net.pl/1875-wzmacniacze-do-gitary-akustycznej",
  "https://riff.net.pl/1874-wzmacniacze-do-gitary-basowej",
  "https://riff.net.pl/1877-efekty-do-gitary-i-basu",
];

const MAX_PAGES = parseInt(process.argv[2] ?? "999", 10);
const PAGE_DELAY_MS = 10000; // między stronami tej samej kategorii
const CAT_DELAY_MS = 6000;   // między kategoriami

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Ekstrakcja produktów z aktualnie załadowanej strony ──────────────────────

async function extractProducts(page: import("playwright").Page): Promise<{
  products: Array<{
    item_id: string;
    name_raw: string;
    price_raw: number;
    category_raw: string;
    image_url_raw: string | null;
    product_url: string | null;
  }>;
  lastPage: number;
}> {
  return page.evaluate(() => {
    // 1. DataLayer → brand + category2/3
    const brandMap: Record<string, { cat2: string; cat3: string }> = {};
    try {
      const dl: any[] = (window as any).dataLayer ?? [];
      const listEvent = dl.find((e: any) => e?.event === "view_item_list");
      for (const item of listEvent?.ecommerce?.items ?? []) {
        if (item?.item_id) {
          brandMap[String(item.item_id)] = {
            cat2: item.item_category2 ?? "",
            cat3: item.item_category3 ?? "",
          };
        }
      }
    } catch { /* ignoruj */ }

    // 2. Article tagi → produkty
    const products: Array<{
      item_id: string; name_raw: string; price_raw: number;
      category_raw: string; image_url_raw: string | null; product_url: string | null;
    }> = [];

    for (const article of document.querySelectorAll<HTMLElement>("article.product-miniature")) {
      const itemId = article.getAttribute("data-id-product") ?? "";
      const name   = article.getAttribute("data-name") ?? "";
      const price  = parseFloat(article.getAttribute("data-price") ?? "");
      if (!itemId || !name || isNaN(price) || price <= 0) continue;

      const productUrl = article.querySelector<HTMLAnchorElement>(".product-title a, a.thumbnail.product-thumbnail")?.getAttribute("href") ?? null;
      const imageUrl   = article.querySelector<HTMLImageElement>(".thumbnail-container img")?.getAttribute("src") ?? null;

      const dl = brandMap[itemId];
      const cat3 = dl?.cat3 || article.getAttribute("data-category") || "";
      const cat2 = dl?.cat2 ?? "";
      const categoryRaw = [cat2, cat3].filter(Boolean).join(" > ") || cat2 || cat3;

      products.push({ item_id: itemId, name_raw: name, price_raw: price, category_raw: categoryRaw, image_url_raw: imageUrl, product_url: productUrl });
    }

    // 3. Ostatnia strona paginacji
    let lastPage = 1;
    for (const link of document.querySelectorAll<HTMLAnchorElement>("nav.pagination a.js-search-link")) {
      const m = link.href?.match(/[?&]page=(\d+)/);
      if (m) { const n = parseInt(m[1], 10); if (n > lastPage) lastPage = n; }
    }

    return { products, lastPage };
  });
}

// ── Dismiss bannera cookies (CybotCookiebot) ─────────────────────────────────

async function dismissCookieBanner(page: import("playwright").Page): Promise<void> {
  await page.evaluate(() => {
    const btn =
      document.querySelector<HTMLElement>("#CybotCookiebotDialogBodyButtonDecline") ??
      document.querySelector<HTMLElement>("#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll") ??
      document.querySelector<HTMLElement>("[id*='CybotCookiebot'][id*='Allow']") ??
      document.querySelector<HTMLElement>("[id*='CybotCookiebot'][id*='Decline']");
    btn?.click();
  }).catch(() => {});
  await new Promise(r => setTimeout(r, 600));
}

// ── Scrapowanie jednej kategorii (świeży context) ────────────────────────────

async function scrapeCategory(
  browser: import("playwright").Browser,
  categoryUrl: string,
  existingUrls: Set<string>,
  maxPages: number
): Promise<{ inserted: number; skipped: number; failed: number }> {
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    locale: "pl-PL",
    extraHTTPHeaders: { "Accept-Language": "pl-PL,pl;q=0.9" },
  });
  const page = await context.newPage();

  let inserted = 0, skipped = 0, failed = 0;
  let lastPage = 1;

  try {
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      process.stdout.write(`  [str. ${pageNum}] `);

      try {
        // Zawsze nawiguj przez URL — AJAX paginacja zwracała te same produkty co str. 1
        const url = pageNum === 1 ? categoryUrl : `${categoryUrl}?page=${pageNum}`;
        await page.goto(url, { waitUntil: "load", timeout: 45000 });
        await page.waitForSelector("article.product-miniature", { timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 1500));
        // Dismiss bannera cookies (blokuje interakcje)
        await dismissCookieBanner(page);
      } catch (navErr: any) {
        console.log(`BŁĄD nawigacji: ${navErr.message?.slice(0, 100)}`);
        if (pageNum === 1) break;
        continue;
      }

      // Diagnostyka: jeśli nie ma artykułów, pokaż tytuł strony
      let articleCount = await page.locator("article.product-miniature").count();
      if (articleCount === 0) {
        const title = await page.title();
        // "Cierpliwości..." = PrestaShop generuje cache on-demand — czekaj i ponów
        if (title.toLowerCase().includes("cierpliwo")) {
          process.stdout.write(`[rate-limit str. ${pageNum}] 15s... `);
          await new Promise(r => setTimeout(r, 15000));
          await page.reload({ waitUntil: "load" }).catch(() => {});
          await page.waitForSelector("article.product-miniature", { timeout: 15000 }).catch(() => {});
          articleCount = await page.locator("article.product-miniature").count();
          if (articleCount === 0) {
            console.log(`brak produktów po retry — przerywam kategorię`);
            break;
          }
          process.stdout.write(`ok (${articleCount} prod.) → `);
        } else {
          process.stdout.write(`0 produktów (tytuł: "${title}")\n`);
          if (pageNum === 1) break;
          break;
        }
      }

      const { products, lastPage: lp } = await extractProducts(page);
      if (pageNum === 1) {
        lastPage = lp;
        process.stdout.write(`(łącznie stron: ${lastPage}) `);
      }

      process.stdout.write(`${products.length} produktów → `);

      let pageInserted = 0, pageSkipped = 0;
      for (const product of products) {
        if (!product.product_url) { pageSkipped++; continue; }
        const fullUrl = product.product_url.startsWith("http")
          ? product.product_url
          : `https://riff.net.pl${product.product_url}`;

        if (existingUrls.has(fullUrl)) { pageSkipped++; continue; }

        const { error } = await supabase.from("gear_items_raw").insert({
          store: "riffnet",
          product_url: fullUrl,
          name_raw: product.name_raw,
          price_raw: product.price_raw,
          category_raw: product.category_raw,
          image_url_raw: product.image_url_raw,
          description_raw: null,
          processed: true,
          processed_at: new Date().toISOString(),
        });

        if (error) {
          failed++;
          console.error(`\n  [BŁĄD] ${fullUrl}: ${error.message}`);
        } else {
          existingUrls.add(fullUrl);
          pageInserted++;
          inserted++;
        }
      }

      console.log(`wstawiono ${pageInserted}, pominięto ${pageSkipped}`);
      skipped += pageSkipped;

      if (pageNum >= lastPage || pageNum >= maxPages) break;
      await new Promise(r => setTimeout(r, PAGE_DELAY_MS));
    }
  } finally {
    await context.close();
  }

  return { inserted, skipped, failed };
}

// ── Główna funkcja ────────────────────────────────────────────────────────────

async function run() {
  console.log("=== importRiffNetProducts.ts ===");
  console.log(`Kategorie: ${CATEGORY_URLS.length}, max stron: ${MAX_PAGES}\n`);

  const { data: existing, error: existErr } = await supabase
    .from("gear_items_raw").select("product_url").eq("store", "riffnet");

  if (existErr) { console.error("Błąd Supabase:", existErr.message); process.exit(1); }

  const existingUrls = new Set((existing ?? []).map((r: any) => r.product_url));
  console.log(`Już w bazie (riffnet): ${existingUrls.size}\n`);

  const browser = await chromium.launch({ headless: true });

  let totalInserted = 0, totalSkipped = 0, totalFailed = 0;

  for (const categoryUrl of CATEGORY_URLS) {
    console.log(`\n── Kategoria: ${categoryUrl}`);
    try {
      const { inserted, skipped, failed } = await scrapeCategory(browser, categoryUrl, existingUrls, MAX_PAGES);
      totalInserted += inserted;
      totalSkipped += skipped;
      totalFailed += failed;
    } catch (err: any) {
      console.error(`  [BŁĄD KATEGORII] ${err.message?.slice(0, 100)}`);
    }
    await new Promise(r => setTimeout(r, CAT_DELAY_MS));
  }

  await browser.close();

  console.log("\n=== GOTOWE ===");
  console.log(`Wstawiono:  ${totalInserted}`);
  console.log(`Pominięto:  ${totalSkipped}`);
  console.log(`Błędy:      ${totalFailed}`);
  console.log(`\nNastępny krok: npx ts-node --esm scripts/runEnrich.ts`);
}

run().catch(err => { console.error("KRYTYCZNY:", err); process.exit(1); });
