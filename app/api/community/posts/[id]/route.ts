export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

// GET /api/community/posts/[id] — pojedynczy post z komentarzami
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();

  const { data: post, error } = await supabase
    .from("posts")
    .select(`
      id, title, content, status, created_at,
      profiles!author_id ( nick, avatar_url )
    `)
    .eq("id", params.id)
    .eq("status", "approved")
    .single();

  if (error || !post) {
    return NextResponse.json({ error: "Post nie znaleziony" }, { status: 404 });
  }

  const { data: comments } = await supabase
    .from("comments")
    .select(`
      id, content, created_at, parent_id,
      profiles!author_id ( nick, avatar_url )
    `)
    .eq("post_id", params.id)
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  return NextResponse.json({
    post: {
      id: (post as any).id,
      title: (post as any).title,
      content: (post as any).content,
      created_at: (post as any).created_at,
      author_nick: (post as any).profiles?.nick ?? "użytkownik",
      author_avatar: (post as any).profiles?.avatar_url ?? null,
    },
    comments: (comments ?? []).map((c: any) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      parent_id: c.parent_id ?? null,
      author_nick: c.profiles?.nick ?? "użytkownik",
      author_avatar: c.profiles?.avatar_url ?? null,
    })),
  });
}
