// scripts/importRiffNetSitemap.ts
// Importuje produkty z riff.net.pl przez sitemap XML z rotacją proxy
// Uruchom: npx ts-node scripts/importRiffNetSitemap.ts [maxProducts]

import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

// ── Konfiguracja ─────────────────────────────────────────────────────────────
const SITEMAP_URL = "https://riff.net.pl/1_pl_0_sitemap.xml";
const PAGE_DELAY_MS = 2000; // krótszy delay — każdy produkt przez inny IP
const MAX_PRODUCTS = parseInt(process.argv[2] ?? "999999", 10);

// Proxy Webshare — rotacja round-robin, nowy context per produkt
const PROXY_USER = process.env.PROXY_USER!;
const PROXY_PASS = process.env.PROXY_PASS!;
const PROXIES = [
  "31.59.20.176:6754",
  "23.95.150.145:6114",
  "198.23.239.134:6540",
  "45.38.107.97:6014",
  "107.172.163.27:6543",
  "198.105.121.200:6462",
  "64.137.96.74:6641",
  "216.10.27.159:6837",
  "142.111.67.146:5611",
  "194.39.32.164:6461",
].map(hp => ({ server: `http://${hp}`, username: PROXY_USER, password: PROXY_PASS }));

// Słowa kluczowe do filtrowania URL-i produktów gitarowych
const GUITAR_KEYWORDS = [
  "gitary-elektryczne",
  "gitary-akustyczne",
  "gitary-klasyczne",
  "gitary-basowe",
  "wzmacniacze",
  "efekty-do-git",
];

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Pobierz sitemap XML przez Playwright (bez proxy — sitemap nie jest rate-limitowany) ──

async function fetchSitemapViaPlaywright(browser: import("playwright").Browser, url: string): Promise<string> {
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    locale: "pl-PL",
    extraHTTPHeaders: { "Accept-Language": "pl-PL,pl;q=0.9" },
  });
  const page = await context.newPage();
  const response = await page.goto(url, { waitUntil: "load", timeout: 60000 });
  console.log(`  HTTP ${response?.status()}`);
  if (!response?.ok()) throw new Error(`HTTP ${response?.status()} przy pobieraniu sitemap`);
  const xml = await response.text();
  await context.close();
  console.log(`  Rozmiar: ${(xml.length / 1024).toFixed(0)} KB`);
  return xml;
}

// ── Wyodrębnij URL-i produktów z XML ─────────────────────────────────────────

function extractProductUrls(xml: string): string[] {
  const urls: string[] = [];
  const cdataPattern = /CDATA\[(https:\/\/[^\]]+)\]/g;
  const locPattern = /<loc>(https:\/\/[^<]+)<\/loc>/g;

  let m: RegExpExecArray | null;
  while ((m = cdataPattern.exec(xml)) !== null) urls.push(m[1]);
  while ((m = locPattern.exec(xml)) !== null) urls.push(m[1]);

  return urls.filter(u =>
    !u.includes("jpg") &&
    !u.includes("png") &&
    !u.includes("large_default") &&
    !u.includes("small_default") &&
    !u.includes("struny") &&
    GUITAR_KEYWORDS.some(kw => u.includes(kw)) &&
    u.split("/").length >= 5
  );
}

// ── Ekstrakcja danych produktu ze strony ─────────────────────────────────────

async function extractProductData(page: import("playwright").Page): Promise<{
  name_raw: string;
  price_raw: number;
  category_raw: string;
  image_url_raw: string | null;
} | null> {
  return page.evaluate(() => {
    // 1. DataLayer (view_item)
    try {
      const dl: any[] = (window as any).dataLayer ?? [];
      const viewItem = dl.find((e: any) => e?.event === "view_item" || e?.ecommerce?.detail);
      const item = viewItem?.ecommerce?.items?.[0] ?? viewItem?.ecommerce?.detail?.products?.[0];
      if (item?.item_name && item?.price) {
        const img = document.querySelector<HTMLImageElement>(".product-cover img, .js-qv-product-cover, img[itemprop='image']");
        return {
          name_raw: item.item_name,
          price_raw: parseFloat(String(item.price).replace(",", ".")),
          category_raw: [item.item_category, item.item_category2, item.item_category3]
            .filter(Boolean).join(" > "),
          image_url_raw: img?.src ?? null,
        };
      }
    } catch { /* ignoruj */ }

    // 2. Fallback: DOM
    const nameEl = document.querySelector<HTMLElement>("h1[itemprop='name'], h1.product-detail-name, .product_name h1");
    const priceEl = document.querySelector<HTMLElement>("[itemprop='price'], .current-price-value, .price");
    const catEls = document.querySelectorAll<HTMLElement>(".breadcrumb li a, [itemprop='item'] span");
    const imgEl = document.querySelector<HTMLImageElement>(".product-cover img, .js-qv-product-cover");

    const name = nameEl?.textContent?.trim() ?? "";
    const priceRaw = priceEl?.getAttribute("content") ?? priceEl?.textContent?.trim() ?? "";
    const price = parseFloat(priceRaw.replace(/[^\d,\.]/g, "").replace(",", "."));
    const cats = Array.from(catEls).map(el => el.textContent?.trim()).filter(Boolean);
    const category = cats.slice(1).join(" > ");

    if (!name || isNaN(price) || price <= 0) return null;
    return {
      name_raw: name,
      price_raw: price,
      category_raw: category,
      image_url_raw: imgEl?.src ?? null,
    };
  });
}

// ── Główna funkcja ────────────────────────────────────────────────────────────

async function run() {
  console.log("=== importRiffNetSitemap.ts (z proxy) ===");
  console.log(`Proxy: ${PROXIES.length} IP w rotacji\n`);

  const { data: existing, error: existErr } = await supabase
    .from("gear_items_raw").select("product_url").eq("store", "riffnet");
  if (existErr) { console.error("Błąd Supabase:", existErr.message); process.exit(1); }

  const existingUrls = new Set((existing ?? []).map((r: any) => r.product_url));
  console.log(`Już w bazie (riffnet): ${existingUrls.size}`);

  const browser = await chromium.launch({ headless: true });

  console.log(`\nPobieranie sitemap...`);
  const xml = await fetchSitemapViaPlaywright(browser, SITEMAP_URL);
  const allUrls = extractProductUrls(xml);
  const newUrls = allUrls.filter(u => !existingUrls.has(u)).slice(0, MAX_PRODUCTS);
  console.log(`URL-i w sitemapie: ${allUrls.length}, nowych do pobrania: ${newUrls.length}\n`);

  if (newUrls.length === 0) {
    await browser.close();
    console.log("Brak nowych URL-i. Koniec.");
    return;
  }

  let inserted = 0, skipped = 0, failed = 0;

  for (let i = 0; i < newUrls.length; i++) {
    const url = newUrls[i];
    const proxy = PROXIES[i % PROXIES.length];
    const proxyLabel = proxy.server.replace("http://", "").split(":")[0];
    process.stdout.write(`[${i + 1}/${newUrls.length}] [${proxyLabel}] ${url.split("/").slice(-1)[0].slice(0, 45)} ... `);

    // Nowy context per produkt — świeże cookies + inny proxy
    const context = await browser.newContext({
      proxy,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      locale: "pl-PL",
      extraHTTPHeaders: { "Accept-Language": "pl-PL,pl;q=0.9" },
    });
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: "load", timeout: 35000 });
      await new Promise(r => setTimeout(r, 2000));

      // Dismiss cookie banner (każdy context zaczyna od nowa)
      await page.evaluate(() => {
        const btn =
          document.querySelector<HTMLElement>("#CybotCookiebotDialogBodyButtonDecline") ??
          document.querySelector<HTMLElement>("#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll") ??
          document.querySelector<HTMLElement>("[id*='CybotCookiebot'][id*='Decline']") ??
          document.querySelector<HTMLElement>("[id*='CybotCookiebot'][id*='Allow']");
        btn?.click();
      }).catch(() => {});
      await new Promise(r => setTimeout(r, 500));

      // Sprawdź rate-limit i bot-detection redirect
      const title = await page.title();
      if (title.toLowerCase().includes("cierpliwo")) {
        console.log(`[rate-limit — proxy ${proxyLabel} blokowany]`);
        failed++;
        await context.close().catch(() => {});
        continue;
      }
      if (title === "Sklep Internetowy RIFF" || title === "Just a moment..." || title.toLowerCase().includes("just a moment")) {
        console.log(`[bot-detect redirect — proxy ${proxyLabel}]`);
        failed++;
        await context.close().catch(() => {});
        continue;
      }

      const data = await extractProductData(page);
      if (!data) {
        const dbgTitle = await page.title().catch(() => "?");
        console.log(`SKIP (brak danych, tytuł: "${dbgTitle.slice(0, 60)}")`);
        skipped++;
      } else {
        const { error } = await supabase.from("gear_items_raw").insert({
          store: "riffnet",
          product_url: url,
          name_raw: data.name_raw,
          price_raw: data.price_raw,
          category_raw: data.category_raw,
          image_url_raw: data.image_url_raw,
          description_raw: null,
          processed: true,
          processed_at: new Date().toISOString(),
        });

        if (error) {
          console.log(`BŁĄD DB: ${error.message.slice(0, 80)}`);
          failed++;
        } else {
          existingUrls.add(url);
          inserted++;
          console.log(`OK [${data.name_raw.slice(0, 40)}] ${data.price_raw} zł`);
        }
      }
    } catch (err: any) {
      console.log(`BŁĄD: ${err.message?.slice(0, 80)}`);
      failed++;
    } finally {
      await context.close().catch(() => {});
    }

    if (i < newUrls.length - 1) {
      await new Promise(r => setTimeout(r, PAGE_DELAY_MS));
    }
  }

  await browser.close().catch(() => {});

  console.log("\n=== GOTOWE ===");
  console.log(`Wstawiono:  ${inserted}`);
  console.log(`Pominięto:  ${skipped}`);
  console.log(`Błędy:      ${failed}`);
  console.log(`\nNastępny krok: npx ts-node --esm scripts/runEnrich.ts`);
}

run().catch(err => { console.error("KRYTYCZNY:", err); process.exit(1); });
