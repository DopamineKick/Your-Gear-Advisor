export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/adminAuth";

// GET /api/admin/posts — wszystkie posty (pending + approved + rejected) do moderacji
export async function GET(request: NextRequest) {
  const adminId = await requireAdmin(request.headers.get("Authorization"));
  if (!adminId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";

  const { data, error } = await supabase
    .from("posts")
    .select(`
      id, title, content, status, created_at,
      profiles!author_id ( nick )
    `)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const posts = (data ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    status: p.status,
    created_at: p.created_at,
    author_nick: p.profiles?.nick ?? "?",
  }));

  return NextResponse.json({ posts });
}
