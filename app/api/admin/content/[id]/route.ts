export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/adminAuth";

// PUT /api/admin/content/[id] — edytuj wpis
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminId = await requireAdmin(request.headers.get("Authorization"));
  if (!adminId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { slug, title, excerpt, content, sort_order } = await request.json();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("content_items")
    .update({ slug, title, excerpt, content, sort_order })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Slug już istnieje" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
}

// DELETE /api/admin/content/[id] — usuń wpis
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminId = await requireAdmin(request.headers.get("Authorization"));
  if (!adminId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const supabase = createServerClient();
  const { error } = await supabase.from("content_items").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
