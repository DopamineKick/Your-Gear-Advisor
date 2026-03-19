import { Page } from "playwright";
import { scrapeThomannProductPage } from "./scrapeThomannProduct";
import { scrapeGear4MusicProductPage } from "./scrapeGear4MusicProduct";

export async function scrapeProductPage(
  page: Page,
  productUrl: string,
  store: string
) {
  const s = store.toLowerCase();

  if (s === "thomann") {
    return scrapeThomannProductPage(page, productUrl);
  }

  if (s === "gear4music") {
    return scrapeGear4MusicProductPage(page, productUrl);
  }

  throw new Error(`Unsupported store: ${store}`);
}
