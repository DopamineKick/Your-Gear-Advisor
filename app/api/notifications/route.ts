export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/adminAuth";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const userId = await requireAuth(req.headers.get("Authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Personal notifications (mentions, replies, direct admin messages)
  const { data: personal } = await supabase
    .from("notifications")
    .select("id, type, content, post_id, from_nick, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  // Broadcasts: fetch all, then filter by not-yet-read by this user
  const [{ data: allBroadcasts }, { data: readBroadcasts }] = await Promise.all([
    supabase
      .from("admin_broadcasts")
      .select("id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("admin_broadcast_reads")
      .select("broadcast_id")
      .eq("user_id", userId),
  ]);

  const readIds = new Set((readBroadcasts ?? []).map((r: any) => r.broadcast_id));

  const broadcasts = (allBroadcasts ?? []).map((b: any) => ({
    id: b.id,
    type: "broadcast" as const,
    content: b.content,
    post_id: null,
    from_nick: "Admin",
    is_read: readIds.has(b.id),
    is_broadcast: true,
    created_at: b.created_at,
  }));

  const personalMapped = (personal ?? []).map((n: any) => ({
    ...n,
    is_broadcast: false,
  }));

  // Merge and sort by date
  const all = [...personalMapped, ...broadcasts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const total_unread = all.filter((n) => !n.is_read).length;

  return NextResponse.json({ notifications: all, total_unread });
}
