export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/adminAuth";
import { createClient } from "@supabase/supabase-js";

// PATCH /api/notifications/[id] — mark as read
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await requireAuth(req.headers.get("Authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { is_broadcast } = await req.json();

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (is_broadcast) {
    // Mark broadcast as read (upsert to handle duplicates gracefully)
    await supabase
      .from("admin_broadcast_reads")
      .upsert({ broadcast_id: params.id, user_id: userId }, { onConflict: "broadcast_id,user_id" });
  } else {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", params.id)
      .eq("user_id", userId);
  }

  return NextResponse.json({ ok: true });
}
