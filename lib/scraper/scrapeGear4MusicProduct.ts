// lib/scraper/scrapeGear4MusicProduct.ts
import { Page } from "playwright";

export type RawProductData = {
  name_raw: string | null;
  description_raw: string | null;
  image_url_raw: string | null;
  price_raw: number | null;
  category_raw: string | null;
  sku_raw: string | null;
  ean_raw: string | null;
};

// Clean HTML → text → max 3000 chars
function cleanAndTrim(html: string | null, maxLength = 3000): string | null {
  if (!html) return null;

  let text = html;

  text = text.replace(/<li>/gi, "• ");
  text = text.replace(/<\/(p|div|h[1-6])>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");

  text = text.replace(/\r/g, "");
  text = text.replace(/\t/g, " ");
  text = text.replace(/ +/g, " ");
  text = text.replace(/ *\n */g, "\n");
  text = text.replace(/\n{2,}/g, "\n");
  text = text.trim();

  if (text.length > maxLength) {
    text = text.slice(0, maxLength);
  }

  return text || null;
}

export async function scrapeGear4MusicProductPage(
  page: Page,
  productUrl: string
): Promise<RawProductData> {
  await page.setExtraHTTPHeaders({
    "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.1",
  });

  await page.goto(productUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  // Krótkie oczekiwanie na JS po DOM (zastępuje networkidle, który się wiesza)
  await page.waitForTimeout(1500);

  // spróbuj poczekać na opis, ale nie wywalaj całej funkcji jeśli go nie ma
  await page
    .waitForSelector(
      ".product-description, .pdp-description, #product-description, [itemprop='description']",
      { timeout: 8000 }
    )
    .catch(() => {});

  const { name_raw, image_url_raw, price_raw, category_raw, description_html, specs_text } =
    await page.evaluate(() => {
      const getText = (selector: string): string | null => {
        const el = document.querySelector<HTMLElement>(selector);
        return el?.textContent?.trim() || null;
      };

      const getAttr = (selector: string, attr: string): string | null => {
        const el = document.querySelector<HTMLElement>(selector);
        return el?.getAttribute(attr) || null;
      };

      const getMeta = (selector: string, attr: string): string | null => {
        const el = document.querySelector<HTMLMetaElement>(selector);
        return el?.getAttribute(attr) || null;
      };

      // Parsuj polską liczbę: "5.623,90 zł" → 5623.90, "943,90 zł" → 943.90
      const parsePolishPrice = (text: string): number | null => {
        // Usuń wszystko poza cyframi, przecinkiem i kropką
        let clean = text.replace(/[^\d,.]/g, "");
        if (!clean) return null;
        // Jeśli jest przecinek po kropce lub numer kończy się przecinkiem+2 cyfry:
        // "5.623,90" → usuń kropki (separatory tysięcy), zamień przecinek na kropkę
        // "943,90" → zamień przecinek na kropkę
        // "5.623" (brak przecinka, kropka oddziela tysiące) → usuń kropkę
        if (/\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(clean)) {
          // format: 5.623,90 lub 5.623
          clean = clean.replace(/\./g, "").replace(",", ".");
        } else {
          // format: 943,90 lub 943
          clean = clean.replace(",", ".");
        }
        const parsed = parseFloat(clean);
        return Number.isNaN(parsed) ? null : parsed;
      };

      const name =
        getText("h1") ||
        getText(".product-title") ||
        getText("[data-product-name]") ||
        null;

      const image =
        getAttr("img[src*='gear4music']", "src") ||
        getAttr("img.pdp-main-image", "src") ||
        null;

      const category =
        getText(".breadcrumb") ||
        getText(".pdp-breadcrumb") ||
        null;

      let price_raw: number | null = null;

      // 1. JSON-LD (najbardziej wiarygodne — zawiera currency)
      const ldScripts = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      );
      for (const script of ldScripts) {
        try {
          const data = JSON.parse(script.textContent || "");
          const offers = data?.offers ?? (data?.["@graph"] ?? []).find((n: any) => n?.offers)?.offers;
          const offer = Array.isArray(offers) ? offers[0] : offers;
          if (offer?.priceCurrency === "PLN" && offer?.price) {
            const p = parseFloat(String(offer.price));
            if (!Number.isNaN(p) && p > 0) { price_raw = p; break; }
          }
        } catch { /* ignoruj */ }
      }

      // 2. Meta tagi
      if (price_raw === null) {
        const metaPrice =
          getMeta("meta[property='product:price:amount']", "content") ||
          getMeta("meta[itemprop='price']", "content") ||
          getMeta("meta[property='og:price:amount']", "content");
        if (metaPrice) {
          const p = parseFloat(metaPrice.replace(",", "."));
          if (!Number.isNaN(p) && p > 0) price_raw = p;
        }
      }

      // 3. DOM — szukamy elementu zawierającego "zł"
      if (price_raw === null) {
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
          // akceptuj tylko jeśli zawiera "zł" lub wygląda jak cena PLN
          if (text && (text.includes("zł") || /^\d[\d\s.,]+$/.test(text))) {
            const p = parsePolishPrice(text);
            if (p !== null && p > 0) { price_raw = p; break; }
          }
        }
      }

      const descEl =
        document.querySelector(".product-description") ||
        document.querySelector(".pdp-description") ||
        document.querySelector("#product-description") ||
        document.querySelector("[itemprop='description']");

      const description_html = descEl?.innerHTML || null;

      // Scrapuj tabelkę specyfikacji technicznych
      const specSelectors = [
        ".specifications-content",
        ".product-specifications",
        ".pdp-specifications",
        ".specification-table",
        ".spec-table",
        "#specifications",
        "[data-component='Specifications']",
        ".specifications",
      ];

      let specs_text: string | null = null;
      for (const sel of specSelectors) {
        const el = document.querySelector(sel);
        if (!el) continue;

        // Szukaj wierszy tabeli (tr) lub par label/value
        const rows = el.querySelectorAll("tr");
        if (rows.length > 0) {
          const specs: string[] = [];
          rows.forEach((row) => {
            const cells = row.querySelectorAll("td, th");
            if (cells.length >= 2) {
              const key = cells[0]?.textContent?.trim();
              const val = cells[1]?.textContent?.trim();
              if (key && val && key !== val) specs.push(`${key}: ${val}`);
            }
          });
          if (specs.length > 0) { specs_text = specs.join("\n"); break; }
        }

        // Fallback: szukaj par dt/dd (lista definicji)
        const dts = el.querySelectorAll("dt");
        const dds = el.querySelectorAll("dd");
        if (dts.length > 0 && dts.length === dds.length) {
          const specs: string[] = [];
          dts.forEach((dt, i) => {
            const key = dt.textContent?.trim();
            const val = dds[i]?.textContent?.trim();
            if (key && val) specs.push(`${key}: ${val}`);
          });
          if (specs.length > 0) { specs_text = specs.join("\n"); break; }
        }

        // Ostatni fallback: surowy tekst sekcji
        const raw = el.textContent?.trim();
        if (raw && raw.length > 30) { specs_text = raw.slice(0, 1000); break; }
      }

      return {
        name_raw: name,
        image_url_raw: image,
        price_raw,
        category_raw: category,
        description_html,
        specs_text,
      };
    });

  const desc = cleanAndTrim(description_html, 1500) ?? "";
  const specs = specs_text ? `\n\nSPECYFIKACJA:\n${specs_text.slice(0, 1200)}` : "";
  const description_raw = (desc + specs).trim() || null;

  return {
    name_raw,
    description_raw,
    image_url_raw,
    price_raw,
    category_raw,
    sku_raw: null,
    ean_raw: null,
  };
}
