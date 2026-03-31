export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import { notifyMentions, notifyPostReply, notifyCommentReply, notifySelf } from "@/lib/notifications";

// POST /api/community/comments — dodaj komentarz (moderacja OpenAI)
export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await anonClient.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Nieważny token" }, { status: 401 });

  const { post_id, content, parent_id, as_bot_id } = await request.json();
  if (!post_id || !content?.trim()) {
    return NextResponse.json({ error: "Brak post_id lub treści" }, { status: 400 });
  }
  const supabase = createServerClient();

  // Sprawdź profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nick, is_admin")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "Brak profilu – ustaw nick w Ustawieniach" }, { status: 403 });
  }

  // Admin może pisać jako bot
  let effectiveAuthorId = user.id;
  let effectiveNick = (profile as any).nick ?? "użytkownik";
  let effectiveAvatar: string | null = null;

  if (as_bot_id && (profile as any).is_admin) {
    const { data: botProfile } = await supabase
      .from("profiles")
      .select("id, nick, avatar_url, is_bot")
      .eq("id", as_bot_id)
      .eq("is_bot", true)
      .single();
    if (!botProfile) {
      return NextResponse.json({ error: "Bot nie znaleziony" }, { status: 404 });
    }
    effectiveAuthorId = botProfile.id;
    effectiveNick = botProfile.nick;
    effectiveAvatar = botProfile.avatar_url;
  }

  if (!(profile as any).is_admin && /https?:\/\/[^\s]+|www\.[^\s]+/i.test(content)) {
    return NextResponse.json({ error: "Brak możliwości przesłania adresu URL" }, { status: 400 });
  }

  // Rate limit: max 3 komentarze dziennie (nie dotyczy admina)
  if (!(profile as any).is_admin) {
    const { count } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("author_id", user.id)
      .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Przekroczyłeś dzienny limit komentarzy (3). Limit odnowi się po 24 godzinach." },
        { status: 429 }
      );
    }
  }

  // Sprawdź czy post istnieje i jest zatwierdzony
  const { data: post } = await supabase
    .from("posts")
    .select("id, title, author_id")
    .eq("id", post_id)
    .eq("status", "approved")
    .single();
  if (!post) return NextResponse.json({ error: "Post nie znaleziony" }, { status: 404 });

  // Jeśli parent_id podany — sprawdź czy komentarz istnieje
  let parentComment: { id: string; author_id: string } | null = null;
  if (parent_id) {
    const { data: pc } = await supabase
      .from("comments")
      .select("id, author_id")
      .eq("id", parent_id)
      .eq("post_id", post_id)
      .single();
    parentComment = pc ?? null;
  }

  // Moderacja OpenAI
  let status = "approved";
  try {
    const modRes = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: content }),
    });
    const modData = await modRes.json();
    if (modData.results?.[0]?.flagged) {
      status = "flagged";
    }
  } catch {
    // Błąd moderacji — zapisz jako approved, nie blokuj użytkownika
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id,
      author_id: effectiveAuthorId,
      content: content.trim(),
      status,
      ...(parentComment ? { parent_id: parentComment.id } : {}),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire-and-forget notifications (only for approved comments)
  if (status === "approved") {
    const authorNick = effectiveNick;
    const isAdmin = !!(profile as any).is_admin;
    const notifiedUserIds = new Set<string>();

    Promise.resolve().then(async () => {
      // 1. Notify parent comment author (most specific — direct reply)
      if (parentComment && parentComment.author_id !== effectiveAuthorId) {
        await notifyCommentReply(supabase, parentComment.author_id, effectiveAuthorId, authorNick, post_id);
        notifiedUserIds.add(parentComment.author_id);
      }
      // 2. Notify post author — only if not already notified above
      const postAuthorId = (post as any).author_id;
      if (postAuthorId !== effectiveAuthorId && !notifiedUserIds.has(postAuthorId)) {
        await notifyPostReply(supabase, postAuthorId, (post as any).title, effectiveAuthorId, authorNick, post_id);
        notifiedUserIds.add(postAuthorId);
      }
      // 3. @mention notifications — skip users already notified
      await notifyMentions(supabase, content, effectiveAuthorId, authorNick, post_id, isAdmin, notifiedUserIds);
    }).catch(() => {});
  }

  // Self-notification (only when not writing as a bot)
  if (!as_bot_id) {
    if (status === "approved") {
      notifySelf(supabase, user.id, `Twój komentarz w poście „${((post as any).title ?? "").slice(0, 50)}" został opublikowany`, post_id).catch(() => {});
    } else if (status === "flagged") {
      notifySelf(supabase, user.id, `Twój komentarz oczekuje na moderację`, null).catch(() => {});
    }
  }

  if (status === "flagged") {
    return NextResponse.json({
      comment: data,
      message: "Komentarz oznaczony do weryfikacji — pojawi się po sprawdzeniu",
      flagged: true,
    });
  }

  return NextResponse.json({
    comment: data,
    author_nick: effectiveNick,
    author_avatar: effectiveAvatar,
  });
}
