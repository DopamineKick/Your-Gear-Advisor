// lib/notifications.ts
// Helper functions for the notifications system

import { SupabaseClient } from "@supabase/supabase-js";

const MENTION_LIMIT_PER_TARGET = 3;
const WINDOW_MS = 86_400_000; // 24 hours

/** Extracts unique @nick mentions from text */
export function extractMentions(text: string): string[] {
  const matches = [...text.matchAll(/@([a-zA-Z0-9_]{3,20})/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

/**
 * Creates mention notifications for all @mentioned users in text.
 * Skips: the author themselves, users already mentioned 3+ times by this author in last 24h.
 * isAdmin = true skips the rate-limit check.
 */
export async function notifyMentions(
  supabase: SupabaseClient,
  text: string,
  authorId: string,
  authorNick: string,
  postId: string,
  isAdmin: boolean
): Promise<void> {
  const nicks = extractMentions(text);
  if (!nicks.length) return;

  const { data: users } = await supabase
    .from("profiles")
    .select("id, nick")
    .in("nick", nicks)
    .neq("id", authorId);

  if (!users?.length) return;

  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const toInsert: object[] = [];

  for (const user of users) {
    if (!isAdmin) {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("type", "mention")
        .eq("from_nick", authorNick)
        .eq("user_id", user.id)
        .gte("created_at", since);

      if ((count ?? 0) >= MENTION_LIMIT_PER_TARGET) continue;
    }

    toInsert.push({
      user_id: user.id,
      type: "mention",
      from_nick: authorNick,
      post_id: postId,
      content: `${authorNick} wspomniał(a) o Tobie`,
    });
  }

  if (toInsert.length > 0) {
    await supabase.from("notifications").insert(toInsert);
  }
}

/**
 * Creates a 'reply' notification for the post author when a new comment is added.
 * Skips if commenter is the post author.
 */
export async function notifyPostReply(
  supabase: SupabaseClient,
  postAuthorId: string,
  postTitle: string,
  commenterId: string,
  commenterNick: string,
  postId: string
): Promise<void> {
  if (postAuthorId === commenterId) return;
  await supabase.from("notifications").insert({
    user_id: postAuthorId,
    type: "reply",
    from_nick: commenterNick,
    post_id: postId,
    content: `${commenterNick} skomentował(a) Twój post „${postTitle.slice(0, 60)}"`,
  });
}

/**
 * Creates a 'reply' notification for the parent comment author.
 * Skips if replier is the parent comment author.
 */
export async function notifyCommentReply(
  supabase: SupabaseClient,
  parentCommentAuthorId: string,
  commenterId: string,
  commenterNick: string,
  postId: string
): Promise<void> {
  if (parentCommentAuthorId === commenterId) return;
  await supabase.from("notifications").insert({
    user_id: parentCommentAuthorId,
    type: "reply",
    from_nick: commenterNick,
    post_id: postId,
    content: `${commenterNick} odpowiedział(a) na Twój komentarz`,
  });
}
