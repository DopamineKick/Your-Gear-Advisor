// lib/scraper/scrapeThomannProduct.ts
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

// Clean HTML → text → max 1000 chars
function cleanAndTrim(html: string | null, maxLength = 1000): string | null {
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

export async function scrapeThomannProductPage(
  page: Page,
  productUrl: string
): Promise<RawProductData> {
  await page.goto(productUrl, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  await page
    .waitForSelector(
      "[data-testid='product-description'], .fx-product-description, [itemprop='description']",
      { timeout: 8000 }
    )
    .catch(() => {});

  const {
    name_raw,
    image_url_raw,
    price_raw,
    category_raw,
    sku_raw,
    ean_raw,
    description_html,
  } = await page.evaluate(() => {
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

    const name =
      getMeta("meta[property='og:title']", "content") ||
      getText("h1") ||
      getText("[data-testid='product-title']") ||
      null;

    const image =
      getMeta("meta[property='og:image']", "content") ||
      getAttr("img[data-testid='product-image']", "src") ||
      getAttr(".fx-product-image img", "src") ||
      null;

    const category =
      getText("[data-testid='breadcrumb']") ||
      getText(".fx-breadcrumb") ||
      null;

    let price_raw: number | null = null;

    const metaPrice =
      getMeta("meta[property='product:price:amount']", "content") ||
      getMeta("meta[itemprop='price']", "content") ||
      getMeta("meta[property='og:price:amount']", "content");

    if (metaPrice) {
      const parsed = parseFloat(
        metaPrice.replace(/[^\d.,]/g, "").replace(",", ".")
      );
      if (!Number.isNaN(parsed)) price_raw = parsed;
    } else {
      const priceText =
        getText("[data-testid='product-price']") ||
        getText(".fx-product-price__current") ||
        getText(".price") ||
        null;

      if (priceText) {
        const match = priceText.replace(/\s+/g, " ").match(/([\d.,]+)/);
        if (match) {
          const normalized = match[1].replace(/\./g, "").replace(",", ".");
          const parsed = parseFloat(normalized);
          if (!Number.isNaN(parsed)) price_raw = parsed;
        }
      }
    }

    const sku =
      getText("[itemprop='sku']") ||
      getText("[data-testid='product-article-number']") ||
      null;

    const ean =
      getText("[itemprop='gtin13']") ||
      getText("[data-testid='product-ean']") ||
      null;

    const descEl =
      document.querySelector("[data-testid='product-description']") ||
      document.querySelector(".fx-product-description") ||
      document.querySelector("[itemprop='description']");

    const description_html = descEl?.innerHTML || null;

    return {
      name_raw: name,
      image_url_raw: image,
      price_raw,
      category_raw: category,
      sku_raw: sku,
      ean_raw: ean,
      description_html,
    };
  });

  const description_raw = cleanAndTrim(description_html, 1000);

  return {
    name_raw,
    description_raw,
    image_url_raw,
    price_raw,
    category_raw,
    sku_raw,
    ean_raw,
  };
}
