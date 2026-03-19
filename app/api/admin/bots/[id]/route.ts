export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/adminAuth";

// GET /api/admin/bots/[id] — szczegóły bota
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await requireAdmin(request.headers.get("Authorization"));
  if (!adminId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nick, avatar_url, bot_config, next_post_at, next_reply_at")
    .eq("id", params.id)
    .eq("is_bot", true)
    .single();

  if (error || !data) return NextResponse.json({ error: "Bot nie znaleziony" }, { status: 404 });
  return NextResponse.json({ bot: data });
}

// PUT /api/admin/bots/[id] — zaktualizuj konfigurację bota
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await requireAdmin(request.headers.get("Authorization"));
  if (!adminId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const body = await request.json();
  const supabase = createServerClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.bot_config !== undefined) updates.bot_config = body.bot_config;
  if (body.nick !== undefined) {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(body.nick)) {
      return NextResponse.json({ error: "Nieprawidłowy nick" }, { status: 400 });
    }
    updates.nick = body.nick;
  }
  if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;
  if (body.next_post_at !== undefined) updates.next_post_at = body.next_post_at;
  if (body.next_reply_at !== undefined) updates.next_reply_at = body.next_reply_at;

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", params.id)
    .eq("is_bot", true)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bot: data });
}

// DELETE /api/admin/bots/[id] — usuń bota
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await requireAdmin(request.headers.get("Authorization"));
  if (!adminId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const supabase = createServerClient();
  // Usuń konto auth (kaskadowo usuwa profil przez FK)
  const { error } = await supabase.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
