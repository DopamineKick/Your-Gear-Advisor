export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

// GET /api/content?type=guide|article
export async function GET(request: NextRequest) {
  const type = new URL(request.url).searchParams.get("type") ?? "guide";
  if (type !== "guide" && type !== "article") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("id, slug, title, excerpt, sort_order, created_at")
    .eq("type", type)
    .order("sort_order")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
