export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/adminAuth";

// POST /api/admin/bots/[id]/manual-post
// body: { type: "post", title, content } | { type: "comment", post_id, content }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await requireAdmin(request.headers.get("Authorization"));
  if (!adminId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const supabase = createServerClient();

  // Weryfikuj że to bot
  const { data: bot } = await supabase
    .from("profiles")
    .select("id, nick")
    .eq("id", params.id)
    .eq("is_bot", true)
    .single();

  if (!bot) return NextResponse.json({ error: "Bot nie znaleziony" }, { status: 404 });

  const { type, title, content, post_id } = await request.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "Treść jest wymagana" }, { status: 400 });
  }

  if (type === "post") {
    if (!title?.trim()) return NextResponse.json({ error: "Tytuł jest wymagany" }, { status: 400 });

    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        author_id: params.id,
        title: title.trim(),
        content: content.trim(),
        status: "approved",  // posty bota od razu zatwierdzone
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from("bot_activity_log").insert({
      bot_id: params.id,
      action_type: "manual_post",
      target_id: post.id,
      content: `[${title.trim()}] ${content.trim().slice(0, 100)}`,
    });

    return NextResponse.json({ ok: true, post });
  }

  if (type === "comment") {
    if (!post_id) return NextResponse.json({ error: "post_id jest wymagane" }, { status: 400 });

    const { data: comment, error } = await supabase
      .from("comments")
      .insert({
        post_id,
        author_id: params.id,
        content: content.trim(),
        status: "approved",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from("bot_activity_log").insert({
      bot_id: params.id,
      action_type: "manual_comment",
      target_id: post_id,
      content: content.trim().slice(0, 150),
    });

    return NextResponse.json({ ok: true, comment });
  }

  return NextResponse.json({ error: "Nieprawidłowy typ: 'post' lub 'comment'" }, { status: 400 });
}
