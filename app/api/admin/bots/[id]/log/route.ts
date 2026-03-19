export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/adminAuth";

// GET /api/admin/bots/[id]/log — log aktywności bota
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await requireAdmin(request.headers.get("Authorization"));
  if (!adminId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("bot_activity_log")
    .select("id, action_type, target_id, content, created_at")
    .eq("bot_id", params.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ log: data ?? [] });
}
