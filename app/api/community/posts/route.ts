export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import { notifyMentions } from "@/lib/notifications";

// GET /api/community/posts — lista zatwierdzonych postów
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const serviceClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "30");
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const tagsParam = searchParams.get("tags"); // comma-separated
  const search = searchParams.get("search")?.trim();
  const searchComments = searchParams.get("search_comments") === "true";

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

  // If searching in comments, find matching post IDs first
  let commentMatchPostIds: string[] | null = null;
  if (search && searchComments) {
    const { data: commentMatches } = await serviceClient
      .from("comments")
      .select("post_id")
      .eq("status", "approved")
      .ilike("content", `%${search}%`);
    commentMatchPostIds = [...new Set((commentMatches ?? []).map((c: any) => c.post_id))];
  }

  let query = supabase
    .from("posts")
    .select(`
      id, title, content, status, created_at, tags,
      profiles!author_id ( nick, avatar_url ),
      comments ( count ),
      post_likes ( count )
    `)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  // Tag filter (OR — any of selected tags)
  if (tagsParam) {
    const tags = tagsParam.split(",").map((t) => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      query = query.overlaps("tags", tags);
    }
  }

  // Text search in posts
  if (search) {
    if (commentMatchPostIds && commentMatchPostIds.length > 0) {
      // Search in posts OR include posts with matching comments
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,id.in.(${commentMatchPostIds.join(",")})`);
    } else if (searchComments && commentMatchPostIds?.length === 0) {
      // Comments search enabled but no comment matches — just search posts
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    } else {
      // Only search posts
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get user's likes for these posts
  const postIds = (data ?? []).map((p: any) => p.id);
  let userLikedPostIds = new Set<string>();
  if (userId && postIds.length > 0) {
    const { data: userLikes } = await serviceClient
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds);
    userLikedPostIds = new Set((userLikes ?? []).map((l: any) => l.post_id));
  }

  // Spłaszcz strukturę dla frontendu
  const posts = (data ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    content: p.content.slice(0, 300),
    created_at: p.created_at,
    tags: p.tags ?? [],
    author_nick: p.profiles?.nick ?? "użytkownik",
    author_avatar: p.profiles?.avatar_url ?? null,
    comment_count: p.comments?.[0]?.count ?? 0,
    like_count: p.post_likes?.[0]?.count ?? 0,
    user_liked: userLikedPostIds.has(p.id),
  }));

  return NextResponse.json({ posts });
}

// POST /api/community/posts — utwórz nowy post (status=pending)
export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await anonClient.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Nieważny token" }, { status: 401 });

  const { title, content, tags } = await request.json();
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Tytuł i treść są wymagane" }, { status: 400 });
  }

  // Validate tags
  const validTags = Array.isArray(tags) ? tags.filter((t: any) => typeof t === "string" && t.trim()) : [];
  const supabase = createServerClient();

  // Pobierz profil użytkownika
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Brak profilu – ustaw nick w Ustawieniach" }, { status: 403 });
  }

  if (!(profile as any).is_admin && /https?:\/\/[^\s]+|www\.[^\s]+/i.test(title + " " + content)) {
    return NextResponse.json({ error: "Brak możliwości przesłania adresu URL" }, { status: 400 });
  }

  // Rate limit: max 2 posty dziennie (nie dotyczy admina)
  if (!(profile as any).is_admin) {
    const { count } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("author_id", user.id)
      .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
    if ((count ?? 0) >= 2) {
      return NextResponse.json(
        { error: "Przekroczyłeś dzienny limit postów (2). Limit odnowi się po 24 godzinach." },
        { status: 429 }
      );
    }
  }

  const status = (profile as any).is_admin ? "approved" : "pending";

  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, title: title.trim(), content: content.trim(), status, tags: validTags })
    .select("*, profiles!author_id(nick)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire-and-forget: mention notifications
  const authorNick = (data as any).profiles?.nick ?? "użytkownik";
  notifyMentions(supabase, title + " " + content, user.id, authorNick, (data as any).id, !!(profile as any).is_admin).catch(() => {});

  const message = (profile as any).is_admin
    ? "Post opublikowany"
    : "Post wysłany do moderacji — pojawi się po zatwierdzeniu";

  return NextResponse.json({ post: data, message });
}
