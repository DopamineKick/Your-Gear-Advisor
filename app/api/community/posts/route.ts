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
  const searchPostsText = searchParams.get("posts_search") !== "false"; // default true

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

  // Try with tags column first; fall back to without if migration not yet applied
  const buildQuery = (withTags: boolean) => {
    let q = supabase
      .from("posts")
      .select(`
        id, title, content, status, created_at,${withTags ? " tags," : ""}
        profiles!author_id ( nick, avatar_url ),
        comments ( count )
      `)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (withTags && tagsParam) {
      const tags = tagsParam.split(",").map((t) => t.trim()).filter(Boolean);
      if (tags.length > 0) q = q.overlaps("tags", tags);
    }

    if (search) {
      if (searchPostsText && commentMatchPostIds && commentMatchPostIds.length > 0) {
        q = q.or(`title.ilike.%${search}%,content.ilike.%${search}%,id.in.(${commentMatchPostIds.join(",")})`);
      } else if (searchPostsText) {
        q = q.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      } else if (commentMatchPostIds && commentMatchPostIds.length > 0) {
        q = q.in("id", commentMatchPostIds);
      } else if (!searchPostsText && searchComments) {
        return null;
      }
    }

    return q;
  };

  let queryObj = buildQuery(true);
  if (!queryObj) return NextResponse.json({ posts: [] });

  let { data, error } = await queryObj.range(offset, offset + limit - 1);

  // If tags column doesn't exist yet — retry without it
  if (error) {
    const fallback = buildQuery(false);
    if (!fallback) return NextResponse.json({ posts: [] });
    const result = await fallback.range(offset, offset + limit - 1);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    data = result.data;
    error = null;
  }

  const postIds = (data ?? []).map((p: any) => p.id);

  // Get like counts and user likes — wrapped in try/catch in case migration not yet applied
  let likeCountMap = new Map<string, number>();
  let userLikedPostIds = new Set<string>();
  try {
    if (postIds.length > 0) {
      const { data: likeCounts } = await serviceClient
        .from("post_likes")
        .select("post_id")
        .in("post_id", postIds);
      for (const l of likeCounts ?? []) {
        likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) ?? 0) + 1);
      }
      if (userId) {
        const { data: userLikes } = await serviceClient
          .from("post_likes")
          .select("post_id")
          .eq("user_id", userId)
          .in("post_id", postIds);
        userLikedPostIds = new Set((userLikes ?? []).map((l: any) => l.post_id));
      }
    }
  } catch {
    // Migration not yet applied — likes not available yet
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
    like_count: likeCountMap.get(p.id) ?? 0,
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
