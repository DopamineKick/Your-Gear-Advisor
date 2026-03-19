export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

// GET /api/community/posts-count?since=<iso_timestamp>
export async function GET(request: NextRequest) {
  const since = new URL(request.url).searchParams.get("since");

  const supabase = createServerClient();
  let query = supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");

  if (since) {
    query = query.gt("created_at", since);
  }

  const { count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ count: count ?? 0 });
}
