// app/api/enrich/run/route.ts
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { enrichBatch } from "@/lib/enrichment/enrichBatch";

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await enrichBatch();
    return NextResponse.json({
      success: true,
      processed: result.count,
    });
  } catch (err) {
    console.error("Enrichment error:", err);
    return NextResponse.json(
      { error: "Enrichment failed", details: String(err) },
      { status: 500 }
    );
  }
}
