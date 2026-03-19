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

  const [{ count: personalCount }, broadcastResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false),

    supabase
      .from("admin_broadcasts")
      .select("id")
      .not(
        "id",
        "in",
        `(SELECT broadcast_id FROM admin_broadcast_reads WHERE user_id = '${userId}')`
      ),
  ]);

  const broadcastUnread = broadcastResult.data?.length ?? 0;
  const count = (personalCount ?? 0) + broadcastUnread;

  return NextResponse.json({ count });
}
