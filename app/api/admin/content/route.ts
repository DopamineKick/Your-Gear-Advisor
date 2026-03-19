export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/adminAuth";

// GET /api/admin/content?type=guide|article  — lista (admin)
export async function GET(request: NextRequest) {
  const adminId = await requireAdmin(request.headers.get("Authorization"));
  if (!adminId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const type = new URL(request.url).searchParams.get("type");
  const supabase = createServerClient();

  let query = supabase
    .from("content_items")
    .select("id, type, slug, title, excerpt, sort_order, created_at")
    .order("type")
    .order("sort_order")
    .order("created_at");

  if (type === "guide" || type === "article") {
    query = query.eq("type", type);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

// POST /api/admin/content — utwórz nowy wpis
export async function POST(request: NextRequest) {
  const adminId = await requireAdmin(request.headers.get("Authorization"));
  if (!adminId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { type, slug, title, excerpt, content, sort_order } = await request.json();

  if (!type || !slug || !title || !content) {
    return NextResponse.json({ error: "type, slug, title i content są wymagane" }, { status: 400 });
  }
  if (type !== "guide" && type !== "article") {
    return NextResponse.json({ error: "type musi być guide lub article" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("content_items")
    .insert({ type, slug, title, excerpt: excerpt ?? "", content, sort_order: sort_order ?? 999 })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Slug już istnieje dla tego typu" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
}
