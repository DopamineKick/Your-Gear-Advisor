export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/community/likes — dodaj like (post lub komentarz)
export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await anonClient.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Nieważny token" }, { status: 401 });

  const { target_type, target_id } = await request.json();
  if (!target_type || !target_id) {
    return NextResponse.json({ error: "Brak target_type lub target_id" }, { status: 400 });
  }
  if (target_type !== "post" && target_type !== "comment") {
    return NextResponse.json({ error: "Nieprawidłowy target_type" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const table = target_type === "post" ? "post_likes" : "comment_likes";
  const column = target_type === "post" ? "post_id" : "comment_id";

  // Check if already liked
  const { data: existing } = await supabase
    .from(table)
    .select("id")
    .eq("user_id", user.id)
    .eq(column, target_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Już polubiono" }, { status: 409 });
  }

  const { error } = await supabase
    .from(table)
    .insert({ user_id: user.id, [column]: target_id });

  if (error) {
    // Unique constraint violation = already liked
    if (error.code === "23505") {
      return NextResponse.json({ error: "Już polubiono" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
