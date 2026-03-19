// app/api/price-scraper/run/route.ts
// POST /api/price-scraper/run — batch price scraping z rotacją proxy
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ProxyAgent } from "undici";

const BATCH_LIMIT = 50;
const FETCH_TIMEOUT = 15000;
const DELAY_MS = 2500;        // delay między requestami
const PROXY_RETRY_DELAY = 3000; // czekaj 3s przed przełączeniem proxy (daje czas na reset rate-limit)

const PROXY_USER = process.env.PROXY_USER!;
const PROXY_PASS = process.env.PROXY_PASS!;

const PROXY_HOSTS = [
  { ip: "31.59.20.176",    port: 6754 },
  { ip: "23.95.150.145",   port: 6114 },
  { ip: "198.23.239.134",  port: 6540 },
  { ip: "45.38.107.97",    port: 6014 },
  { ip: "107.172.163.27",  port: 6543 },
  { ip: "198.105.121.200", port: 6462 },
  { ip: "64.137.96.74",    port: 6641 },
  { ip: "216.10.27.159",   port: 6837 },
  { ip: "142.111.67.146",  port: 5611 },
  { ip: "194.39.32.164",   port: 6461 },
];

const PROXIES = PROXY_HOSTS.map(
  ({ ip, port }) => `http://${PROXY_USER}:${PROXY_PASS}@${ip}:${port}`
);

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-GB,en;q=0.9",
};

function detectStore(url: string): "thomann" | "gear4music" | null {
  if (url.includes("thomann")) return "thomann";
  if (url.includes("gear4music")) return "gear4music";
  return null;
}

function parsePrice(html: string): number | null {
  const metaMatch =
    html.match(/<meta[^>]+itemprop="price"[^>]+content="([^"]+)"/i) ||
    html.match(/<meta[^>]+content="([^"]+)"[^>]+itemprop="price"/i) ||
    html.match(/<meta[^>]+property="product:price:amount"[^>]+content="([^"]+)"/i) ||
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="product:price:amount"/i);

  if (metaMatch) {
    const val = parseFloat(metaMatch[1].replace(",", "."));
    if (!Number.isNaN(val) && val > 0) return Math.round(val * 100) / 100;
  }
  return null;
}

// Próbuje pobrać cenę przez konkretne proxy.
// Zwraca: { price: number|null } przy sukcesie lub null|404
//         lub rzuca błąd z kodem (429/403) żeby rotować proxy
async function tryFetchWithProxy(
  url: string,
  proxyUrl: string
): Promise<number | null | "rate_limited"> {
  const agent = new ProxyAgent(proxyUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(url, {
      // @ts-expect-error — undici dispatcher nie jest w typach Node fetch
      dispatcher: agent,
      headers: HEADERS,
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    });

    if (res.status === 404) return null;
    if (res.status === 429 || res.status === 403) return "rate_limited";
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    return parsePrice(html);
  } finally {
    clearTimeout(timer);
  }
}

// Próbuje kolejne proxy przy 429/403 — rotacja przez całą listę
async function fetchPrice(
  url: string,
  startProxyIdx: number
): Promise<{ price: number | null; proxyIdx: number }> {
  let idx = startProxyIdx;

  for (let attempt = 0; attempt < PROXIES.length; attempt++) {
    try {
      const result = await tryFetchWithProxy(url, PROXIES[idx]);

      if (result !== "rate_limited") {
        return { price: result, proxyIdx: idx };
      }

      // Rate limit / IP ban — przełącz na następne proxy
      await new Promise((r) => setTimeout(r, PROXY_RETRY_DELAY));
      idx = (idx + 1) % PROXIES.length;
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Timeout — spróbuj następne proxy
        idx = (idx + 1) % PROXIES.length;
        continue;
      }
      throw err;
    }
  }

  throw new Error("Wszystkie proxy wyczerpane (429/403)");
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Opcjonalny filtr sklepu: { "store": "gear4music" } lub { "store": "thomann" }
  let storeFilter: string | null = null;
  try {
    const body = await req.json();
    storeFilter = body?.store ?? null;
  } catch {
    // brak body — brak filtra
  }

  // Pobierz tylko produkty BEZ żadnego wpisu w gear_price_history
  let query = supabase
    .from("gear_items")
    .select("id, name, product_url, gear_price_history(gear_id)")
    .not("product_url", "is", null)
    .limit(BATCH_LIMIT)
    .filter("gear_price_history.gear_id", "is", null);

  // Filtruj po sklepie jeśli podano
  if (storeFilter) {
    query = query.ilike("product_url", `%${storeFilter}%`);
  }

  const { data: items, error } = await query;

  // Supabase nie robi LEFT JOIN filtrowania natywnie — robimy po stronie JS
  const filteredItems = (items ?? []).filter(
    (item: any) => !item.gear_price_history || item.gear_price_history.length === 0
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (filteredItems.length === 0) {
    return NextResponse.json({ count: 0, errors: 0, message: "Wszystkie produkty mają już ceny." });
  }

  let successCount = 0;
  // Losowy start — równomiernie rozkłada obciążenie między proxy
  let currentProxyIdx = Math.floor(Math.random() * PROXIES.length);
  const errors: string[] = [];

  for (const item of filteredItems) {
    const store = detectStore(item.product_url);
    if (!store) {
      errors.push(`Nieznany sklep: ${item.product_url}`);
      continue;
    }

    try {
      const { price, proxyIdx } = await fetchPrice(item.product_url, currentProxyIdx);
      currentProxyIdx = proxyIdx; // utrzymuj "dobry" proxy dla kolejnych requestów

      if (!price || price <= 0) {
        errors.push(`Brak ceny: ${item.name}`);
      } else {
        const { error: insertError } = await supabase
          .from("gear_price_history")
          .insert({ gear_id: item.id, price, store, currency: "PLN" });

        if (insertError) {
          errors.push(`Błąd zapisu ${item.name}: ${insertError.message}`);
        } else {
          successCount++;
        }
      }
    } catch (err: any) {
      errors.push(`Scraping failed ${item.name}: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  return NextResponse.json({
    count: successCount,
    errors: errors.length,
    errorDetails: errors,
    proxiesAvailable: PROXIES.length,
  });
}
