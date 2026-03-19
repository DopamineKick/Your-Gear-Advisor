// scripts/exportG4MSitemapCSV.ts
// Eksportuje wszystkie produkty z G4M sitemap do CSV (bez scrapowania stron)
// Uruchom: npx ts-node scripts/exportG4MSitemapCSV.ts
// Wynik: g4m_products.csv w katalogu głównym projektu

import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { join } from "path";

const SITEMAP_URL = "https://www.gear4music.pl/sitemaps/pl/pl/sitemap-guitar_bass.xml";
const OUTPUT_FILE = join(process.cwd(), "g4m_products.csv");

(async () => {
  console.log("Pobieranie sitemapa G4M...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });
  const resp = await page.goto(SITEMAP_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (!resp || resp.status() >= 400) {
    await browser.close();
    throw new Error(`Sitemap HTTP ${resp?.status()}`);
  }
  const xml = await page.content();
  await browser.close();

  console.log(`Sitemap pobrany (${(xml.length / 1024 / 1024).toFixed(1)} MB). Parsowanie...`);

  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)];
  const rows: string[] = ["id,name,url"];

  for (const b of blocks) {
    const loc = b[1].match(/<loc>(.*?)<\/loc>/)?.[1]?.trim() ?? "";
    const pri = b[1].match(/<priority>(.*?)<\/priority>/)?.[1]?.trim() ?? "";
    if (pri !== "0.6" || !loc) continue;

    const parts = loc.split("/");
    const productId = parts[parts.length - 1] ?? "";
    const namePart = parts[parts.length - 2] ?? "";

    // Zamień myślniki na spacje dla czytelności
    const nameReadable = namePart.replace(/-/g, " ");

    // Escapuj cudzysłowy w CSV
    const escapedName = `"${nameReadable.replace(/"/g, '""')}"`;
    const escapedUrl = `"${loc}"`;

    rows.push(`${productId},${escapedName},${escapedUrl}`);
  }

  writeFileSync(OUTPUT_FILE, rows.join("\n"), "utf-8");

  console.log(`\n=== GOTOWE ===`);
  console.log(`Produktów: ${rows.length - 1}`);
  console.log(`Plik: ${OUTPUT_FILE}`);
  console.log(`\nOtwórz g4m_products.csv w Excelu lub Google Sheets,`);
  console.log(`odfiltruj produkty które chcesz, zostaw kolumny id,name,url`);
  console.log(`i zapisz jako plik CSV. Następnie daj mi ten plik.`);
})().catch(e => { console.error("BŁĄD:", e.message); process.exit(1); });
