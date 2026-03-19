export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import { notifyMentions } from "@/lib/notifications";

// GET /api/community/posts — lista zatwierdzonych postów
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "30");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const { data, error } = await supabase
    .from("posts")
    .select(`
      id, title, content, status, created_at,
      profiles!author_id ( nick, avatar_url ),
      comments ( count )
    `)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Spłaszcz strukturę dla frontendu
  const posts = (data ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    content: p.content.slice(0, 300),
    created_at: p.created_at,
    author_nick: p.profiles?.nick ?? "użytkownik",
    author_avatar: p.profiles?.avatar_url ?? null,
    comment_count: p.comments?.[0]?.count ?? 0,
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

  const { title, content } = await request.json();
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Tytuł i treść są wymagane" }, { status: 400 });
  }
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
    .insert({ author_id: user.id, title: title.trim(), content: content.trim(), status })
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
