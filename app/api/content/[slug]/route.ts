export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

// GET /api/content/[slug]?type=guide|article
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const type = new URL(request.url).searchParams.get("type") ?? "guide";
  const { slug } = params;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("id, slug, title, excerpt, content, sort_order, created_at")
    .eq("type", type)
    .eq("slug", slug)
    .single();

  if (error || !data) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  return NextResponse.json({ item: data });
}
