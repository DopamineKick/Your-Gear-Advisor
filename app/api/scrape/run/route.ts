// app/api/scrape/run/route.ts
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { createServerClient } from "@/lib/supabaseServer";
import { scrapeProductPage } from "@/lib/scraper/scrapeProductPage";

// 🔥 Limit batcha
const BATCH_LIMIT = 100;

export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  try {
    // Pobierz niescrapowane rekordy dla obsługiwanych sklepów
    const { data: items, error: selectError } = await supabase
      .from("gear_items_raw")
      .select("id, product_url, store")
      .in("store", ["gear4music", "thomann"])
      .or("processed.is.null,processed.eq.false")
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (selectError) {
      console.error("[SCRAPER] Select error:", selectError);
      return NextResponse.json(
        { success: false, error: "Select failed" },
        { status: 500 }
      );
    }

    if (!items || items.length === 0) {
      console.log("[SCRAPER] No items to process.");
      return NextResponse.json({
        success: true,
        processedCount: 0,
      });
    }

    console.log(
      `[SCRAPER] Found ${items.length} items to process (limit ${BATCH_LIMIT}).`
    );

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    });

    let processedCount = 0;

    for (const item of items) {
      const url = item.product_url as string;
      const id = item.id as string;
      const store = (item.store as string)?.toLowerCase();

      console.log("[SCRAPER] Processing:", store, url);

      try {
        // 🔥 UJEDNOLICONY SCRAPER PRODUKTÓW
        const data = await scrapeProductPage(page, url, store);

        if (!data) {
          console.error("[SCRAPER] No data returned for", url);
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
          console.error("[SCRAPER] Update error for", url, updateError);
          continue;
        }

        processedCount++;
        console.log("[SCRAPER] Updated:", store, url);
      } catch (err) {
        console.error("[SCRAPER] Error scraping", store, url, err);
        continue;
      }
    }

    await browser.close();

    console.log("====================================================");
    console.log(
      "🔥 SCRAPER FINISHED — TOTAL PRODUCTS PROCESSED:",
      processedCount
    );
    console.log("====================================================");

    return NextResponse.json({
      success: true,
      processedCount,
    });
  } catch (err: any) {
    console.error("[SCRAPER] Fatal error:", err);
    return NextResponse.json(
      { success: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
