export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/adminAuth";

// GET /api/community/posts/[id] — pojedynczy post z komentarzami
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const serviceClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Optional auth — for "has user liked" info
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  let userId: string | null = null;
  if (token) {
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await anonClient.auth.getUser(token);
    userId = user?.id ?? null;
  }

  // Try with tags first; fall back without tags if migration not yet applied
  let postResult = await supabase
    .from("posts")
    .select(`id, title, content, status, created_at, tags, profiles!author_id ( nick, avatar_url )`)
    .eq("id", params.id)
    .eq("status", "approved")
    .single();

  if (postResult.error) {
    postResult = await supabase
      .from("posts")
      .select(`id, title, content, status, created_at, profiles!author_id ( nick, avatar_url )`)
      .eq("id", params.id)
      .eq("status", "approved")
      .single();
  }

  const post = postResult.data;
  if (postResult.error || !post) {
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

  const commentIds = (comments ?? []).map((c: any) => c.id);

  // Get like counts and user likes — wrapped in try/catch in case migration not yet applied
  let postLikeCount = 0;
  let userLikedPost = false;
  let commentLikeCountMap = new Map<string, number>();
  let userLikedCommentIds = new Set<string>();
  try {
    const [postLikesAll, commentLikesAll] = await Promise.all([
      serviceClient.from("post_likes").select("user_id").eq("post_id", params.id),
      commentIds.length > 0
        ? serviceClient.from("comment_likes").select("comment_id, user_id").in("comment_id", commentIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    postLikeCount = (postLikesAll.data ?? []).length;
    userLikedPost = userId ? (postLikesAll.data ?? []).some((l: any) => l.user_id === userId) : false;

    for (const l of commentLikesAll.data ?? []) {
      commentLikeCountMap.set(l.comment_id, (commentLikeCountMap.get(l.comment_id) ?? 0) + 1);
    }
    if (userId) {
      userLikedCommentIds = new Set(
        (commentLikesAll.data ?? []).filter((l: any) => l.user_id === userId).map((l: any) => l.comment_id)
      );
    }
  } catch {
    // Migration not yet applied — likes not available yet
  }

  return NextResponse.json({
    post: {
      id: (post as any).id,
      title: (post as any).title,
      content: (post as any).content,
      created_at: (post as any).created_at,
      tags: (post as any).tags ?? [],
      author_nick: (post as any).profiles?.nick ?? "użytkownik",
      author_avatar: (post as any).profiles?.avatar_url ?? null,
      like_count: postLikeCount,
      user_liked: userLikedPost,
    },
    comments: (comments ?? []).map((c: any) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      parent_id: c.parent_id ?? null,
      author_nick: c.profiles?.nick ?? "użytkownik",
      author_avatar: c.profiles?.avatar_url ?? null,
      like_count: commentLikeCountMap.get(c.id) ?? 0,
      user_liked: userLikedCommentIds.has(c.id),
    })),
  });
}

// PATCH /api/community/posts/[id] — admin: edit created_at
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await requireAuth(req.headers.get("Authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { created_at } = await req.json();
  if (!created_at || isNaN(Date.parse(created_at))) {
    return NextResponse.json({ error: "Nieprawidłowa data" }, { status: 400 });
  }

  const { error } = await supabase
    .from("posts")
    .update({ created_at: new Date(created_at).toISOString() })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
