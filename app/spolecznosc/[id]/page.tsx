"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { AppSidebar } from "@/components/AppSidebar";
import { useSupabase } from "@/components/SupabaseProvider";

const DEFAULT_AVATAR = "/profile-avatars/avatar_black_strat.png";

const ALL_TAGS = [
  "gitara elektryczna",
  "gitara akustyczna",
  "gitara klasyczna",
  "gitara basowa",
  "efekty gitarowe",
  "multiefekty",
  "wtyczki VST",
  "home recording",
  "artyści",
  "albumy muzyczne",
  "koncerty",
  "lutnictwo i serwis gitarowy",
  "wzmacniacze gitarowe",
  "wzmacniacze basowe",
  "nagłośnienie",
  "części gitarowe",
  "brzmienie gitarowe",
  "oferty",
  "treści na youtube",
];

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  tags: string[];
  author_nick: string;
  author_avatar?: string | null;
  like_count: number;
  user_liked: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  author_nick: string;
  author_avatar?: string | null;
  like_count: number;
  user_liked: boolean;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} ${d === 1 ? "dzień" : "dni"} temu`;
  if (h > 0) return `${h} ${h === 1 ? "godzinę" : "godz."} temu`;
  if (m > 0) return `${m} min temu`;
  return "przed chwilą";
}

/** Build a map: parentId → children, and collect root comments */
function buildTree(comments: Comment[]) {
  const roots: Comment[] = [];
  const children: Record<string, Comment[]> = {};
  for (const c of comments) {
    if (c.parent_id) {
      if (!children[c.parent_id]) children[c.parent_id] = [];
      children[c.parent_id].push(c);
    } else {
      roots.push(c);
    }
  }
  return { roots, children };
}

export default function PostPage() {
  const router = useRouter();
  const params = useParams();
  const { supabase } = useSupabase();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [urlError, setUrlError] = useState("");
  const [myNick, setMyNick] = useState("Ty");
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bots, setBots] = useState<{ id: string; nick: string; avatar_url: string | null }[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [replyTo, setReplyTo] = useState<{ id: string; nick: string } | null>(null);
  const [editingDate, setEditingDate] = useState<{ type: "post" | "comment"; id: string } | null>(null);
  const [dateValue, setDateValue] = useState("");
  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  // Tag editor
  const [editingTags, setEditingTags] = useState(false);
  const [tagEditorSelection, setTagEditorSelection] = useState<string[]>([]);
  const [tagSaving, setTagSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/auth/login"); return; }
      const res = await fetch("/api/auth/create-profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.profile) {
        setMyNick(data.profile.nick ?? "Ty");
        setMyAvatar(data.profile.avatar_url ?? null);
        setIsAdmin(data.profile.is_admin === true);
        // Fetch bots for admin bot selector
        if (data.profile.is_admin) {
          fetch("/api/admin/bots", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
            .then((r) => r.json())
            .then((d) => setBots(d.bots ?? []))
            .catch(() => {});
        }
      }
    });
    fetchPost();
  }, [postId]);

  async function fetchPost() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session) headers["Authorization"] = `Bearer ${session.access_token}`;
    const res = await fetch(`/api/community/posts/${postId}`, { headers });
    if (!res.ok) { router.replace("/spolecznosc"); return; }
    const data = await res.json();
    setPost(data.post);
    setComments(data.comments ?? []);
    setLoading(false);
  }

  async function handleLike(targetType: "post" | "comment", targetId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const currentLiked =
      targetType === "post"
        ? post?.user_liked ?? false
        : comments.find((c) => c.id === targetId)?.user_liked ?? false;

    const isUnliking = isAdmin && currentLiked;

    // Optimistic update
    if (targetType === "post" && post) {
      setPost({ ...post, like_count: isUnliking ? post.like_count - 1 : post.like_count + 1, user_liked: !isUnliking });
    } else {
      setComments((prev) =>
        prev.map((c) =>
          c.id === targetId
            ? { ...c, like_count: isUnliking ? c.like_count - 1 : c.like_count + 1, user_liked: !isUnliking }
            : c
        )
      );
    }

    const res = await fetch("/api/community/likes", {
      method: isUnliking ? "DELETE" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ target_type: targetType, target_id: targetId }),
    });

    if (!res.ok) {
      // Revert on failure
      if (targetType === "post" && post) {
        setPost((prev) => prev ? { ...prev, like_count: isUnliking ? prev.like_count + 1 : prev.like_count - 1, user_liked: isUnliking } : prev);
      } else {
        setComments((prev) =>
          prev.map((c) =>
            c.id === targetId
              ? { ...c, like_count: isUnliking ? c.like_count + 1 : c.like_count - 1, user_liked: isUnliking }
              : c
          )
        );
      }
    }
  }

  async function handleDeletePost() {
    if (!post) return;
    if (!window.confirm("Usunąć ten post? Tej akcji nie można cofnąć.")) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/community/posts/${post.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      router.replace("/spolecznosc");
    }
  }

  async function handleDeleteComment(commentId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/community/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  }

  function handleReply(c: Comment) {
    setReplyTo({ id: c.id, nick: c.author_nick });
    setComment(`@${c.author_nick} `);
    setTimeout(() => {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }, 50);
  }

  function openDateEditor(type: "post" | "comment", id: string, currentDate: string) {
    const d = new Date(currentDate);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDateValue(local);
    setEditingDate({ type, id });
  }

  function openPostEditor() {
    if (!post) return;
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditingPost(true);
  }

  function openTagEditor() {
    if (!post) return;
    setTagEditorSelection(post.tags ?? []);
    setEditingTags(true);
  }

  async function handleSavePost() {
    if (!post || !editTitle.trim() || !editContent.trim()) return;
    setEditSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setEditSaving(false); return; }

    const res = await fetch(`/api/community/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    });

    setEditSaving(false);
    if (res.ok) {
      setPost({ ...post, title: editTitle.trim(), content: editContent.trim() });
      setEditingPost(false);
    }
  }

  async function handleSaveTags() {
    if (!post) return;
    setTagSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setTagSaving(false); return; }

    const res = await fetch(`/api/community/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ tags: tagEditorSelection }),
    });

    setTagSaving(false);
    if (res.ok) {
      setPost({ ...post, tags: tagEditorSelection });
      setEditingTags(false);
    }
  }

  async function handleSaveDate() {
    if (!editingDate || !dateValue) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const endpoint =
      editingDate.type === "post"
        ? `/api/community/posts/${editingDate.id}`
        : `/api/community/comments/${editingDate.id}`;

    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ created_at: new Date(dateValue).toISOString() }),
    });

    if (res.ok) {
      const newDate = new Date(dateValue).toISOString();
      if (editingDate.type === "post" && post) {
        setPost({ ...post, created_at: newDate });
      } else {
        setComments((prev) =>
          prev.map((c) => (c.id === editingDate.id ? { ...c, created_at: newDate } : c))
        );
      }
      setEditingDate(null);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || urlError) return;
    setSending(true);
    setMsg("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSending(false); return; }

    const res = await fetch("/api/community/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        post_id: postId,
        content: comment,
        parent_id: replyTo?.id ?? null,
        ...(selectedBotId ? { as_bot_id: selectedBotId } : {}),
      }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setMsg(data.error ?? "Błąd");
      return;
    }

    if (data.flagged) {
      setMsg("Komentarz zostanie opublikowany po weryfikacji.");
    } else {
      const bot = selectedBotId ? bots.find((b) => b.id === selectedBotId) : null;
      setComments((prev) => [...prev, {
        id: data.comment.id,
        content: data.comment.content,
        created_at: data.comment.created_at,
        parent_id: replyTo?.id ?? null,
        author_nick: bot ? bot.nick : myNick,
        author_avatar: bot ? bot.avatar_url : myAvatar,
        like_count: 0,
        user_liked: false,
      }]);
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setComment("");
    setReplyTo(null);
    setTimeout(() => setMsg(""), 5000);
  }

  function renderComment(c: Comment, children: Record<string, Comment[]>, depth = 0) {
    const replies = children[c.id] ?? [];
    return (
      <div key={c.id}>
        <div
          className="rounded-xl p-4"
          style={{
            background: depth > 0 ? "rgba(8,8,8,0.6)" : "rgba(12,12,12,0.6)",
            border: depth > 0 ? "1px solid rgba(184,92,56,0.1)" : "1px solid rgba(184,92,56,0.15)",
            marginLeft: depth > 0 ? 24 : 0,
            borderLeft: depth > 0 ? "2px solid rgba(184,92,56,0.3)" : undefined,
          }}
        >
          <p className="text-white/75 text-sm leading-relaxed mb-2 whitespace-pre-wrap"
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
            {c.content}
          </p>
          <div className="flex items-center gap-3 text-xs text-white/25">
            <span className="flex items-center gap-1.5">
              <span className="rounded-md overflow-hidden flex-shrink-0" style={{ width: 18, height: 18 }}>
                <Image src={c.author_avatar || DEFAULT_AVATAR} alt="" width={18} height={18} className="object-cover w-full h-full" />
              </span>
              <span className="text-[#B85C38]/60">{c.author_nick}</span>
            </span>
            <span>{timeAgo(c.created_at)}</span>

            {/* Like button for comment */}
            <span
              className="flex items-center gap-1 transition-colors"
              onClick={() => { if (!c.user_liked || isAdmin) handleLike("comment", c.id); }}
              style={{ cursor: (!c.user_liked || isAdmin) ? "pointer" : "default" }}
              title={isAdmin && c.user_liked ? "Kliknij aby cofnąć like (admin)" : undefined}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={c.user_liked ? "#B85C38" : "none"}
                stroke={c.user_liked ? "#B85C38" : "currentColor"}
                strokeWidth="2"
                className={(!c.user_liked || isAdmin) ? "hover:stroke-[#B85C38] transition-colors" : ""}
              >
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
              {c.like_count > 0 && (
                <span className={`text-xs ${c.user_liked ? "text-[#B85C38]" : "text-white/40"}`}>
                  {c.like_count}
                </span>
              )}
            </span>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => handleReply(c)}
                className="text-xs text-white/30 hover:text-[#B85C38] transition-colors flex items-center gap-1"
                style={{ background: "transparent" }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                </svg>
                Odpowiedz
              </button>
              {isAdmin && (
                <>
                  <button
                    onClick={() => openDateEditor("comment", c.id, c.created_at)}
                    className="text-xs text-white/20 hover:text-[#B85C38] transition-colors flex items-center gap-1"
                    style={{ background: "transparent" }}
                    title="Edytuj datę (admin)"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Data
                  </button>
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="text-xs text-red-500/50 hover:text-red-400 transition-colors flex items-center gap-1"
                    style={{ background: "transparent" }}
                    title="Usuń komentarz (admin)"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                    Usuń
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        {replies.map((r) => renderComment(r, children, depth + 1))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <AppSidebar />
        <svg className="animate-spin text-[#B85C38]" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
      </div>
    );
  }

  const { roots, children } = buildTree(comments);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AppSidebar />
      <div className="md:ml-60 px-6 py-8 max-w-3xl mx-auto">

        {/* Wróć */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors"
          style={{ background: "transparent" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Powrót do listy
        </button>

        {/* Post */}
        {post && (
          <div className="rounded-2xl p-6 mb-6" style={{ background: "rgba(12,12,12,0.85)", border: "2px solid rgba(184,92,56,0.55)" }}>
            <h1
              className="text-white text-2xl font-bold mb-4 leading-snug"
              style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
            >
              {post.title}
            </h1>
            <p className="text-white/70 text-sm leading-relaxed mb-4 whitespace-pre-wrap"
              style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
              {post.content}
            </p>

            {/* Tags */}
            {!editingTags && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(post.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      background: "rgba(184,92,56,0.12)",
                      color: "rgba(208,122,80,0.7)",
                      border: "1px solid rgba(184,92,56,0.2)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
                {post.tags?.length === 0 && isAdmin && (
                  <span className="text-xs text-white/20">brak tagów</span>
                )}
              </div>
            )}

            {/* Tag editor — admin only */}
            {editingTags && (
              <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(184,92,56,0.2)" }}>
                <p className="text-xs text-white/40 mb-2">Wybierz tagi:</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {ALL_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setTagEditorSelection((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                        )
                      }
                      className="px-2.5 py-1 rounded-md text-xs transition-all"
                      style={{
                        background: tagEditorSelection.includes(tag) ? "rgba(184,92,56,0.3)" : "rgba(255,255,255,0.05)",
                        border: tagEditorSelection.includes(tag) ? "1px solid rgba(184,92,56,0.6)" : "1px solid rgba(255,255,255,0.08)",
                        color: tagEditorSelection.includes(tag) ? "#D07A50" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditingTags(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white transition-colors"
                    style={{ background: "transparent" }}
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleSaveTags}
                    disabled={tagSaving}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-all hover:scale-[1.02]"
                    style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
                  >
                    {tagSaving ? "Zapisuję..." : "Zapisz tagi"}
                  </button>
                </div>
              </div>
            )}

            {/* Admin actions above metadata */}
            {isAdmin && (
              <div className="flex justify-end gap-4 mb-3">
                <button
                  onClick={openTagEditor}
                  className="flex items-center gap-1.5 text-xs text-white/30 hover:text-[#B85C38] transition-colors"
                  style={{ background: "transparent" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                  Edytuj tagi
                </button>
                <button
                  onClick={openPostEditor}
                  className="flex items-center gap-1.5 text-xs text-white/30 hover:text-[#B85C38] transition-colors"
                  style={{ background: "transparent" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edytuj treść
                </button>
                <button
                  onClick={handleDeletePost}
                  className="flex items-center gap-1.5 text-xs text-red-500/50 hover:text-red-400 transition-colors"
                  style={{ background: "transparent" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                  Usuń post
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-white/30 border-t border-white/8 pt-4">
              <span className="flex items-center gap-1.5">
                <span className="rounded-md overflow-hidden flex-shrink-0" style={{ width: 20, height: 20 }}>
                  <Image src={post.author_avatar || DEFAULT_AVATAR} alt="" width={20} height={20} className="object-cover w-full h-full" />
                </span>
                <span className="text-[#B85C38]/70">{post.author_nick}</span>
              </span>
              <span>{timeAgo(post.created_at)}</span>

              {/* Like button for post */}
              <span
                className="flex items-center gap-1 transition-colors"
                onClick={() => { if (!post.user_liked || isAdmin) handleLike("post", post.id); }}
                style={{ cursor: (!post.user_liked || isAdmin) ? "pointer" : "default" }}
                title={isAdmin && post.user_liked ? "Kliknij aby cofnąć like (admin)" : undefined}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={post.user_liked ? "#B85C38" : "none"}
                  stroke={post.user_liked ? "#B85C38" : "currentColor"}
                  strokeWidth="2"
                  className={(!post.user_liked || isAdmin) ? "hover:stroke-[#B85C38] transition-colors" : ""}
                >
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                </svg>
                {post.like_count > 0 && (
                  <span className={`text-xs ${post.user_liked ? "text-[#B85C38]" : "text-white/40"}`}>
                    {post.like_count}
                  </span>
                )}
              </span>

              {isAdmin && (
                <button
                  onClick={() => openDateEditor("post", post.id, post.created_at)}
                  className="text-xs text-white/20 hover:text-[#B85C38] transition-colors flex items-center gap-1 ml-auto"
                  style={{ background: "transparent" }}
                  title="Edytuj datę (admin)"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Data
                </button>
              )}
            </div>
          </div>
        )}

        {/* Komentarze */}
        <div className="mb-6">
          <h2 className="text-white/60 text-xs uppercase tracking-widest mb-4">
            Komentarze ({comments.length})
          </h2>

          {comments.length === 0 ? (
            <p className="text-white/25 text-sm text-center py-6">Brak komentarzy — bądź pierwszy!</p>
          ) : (
            <div className="flex flex-col gap-3">
              {roots.map((c) => renderComment(c, children))}
              <div ref={commentsEndRef} />
            </div>
          )}
        </div>

        {/* Modal edycji treści posta — admin only */}
        {editingPost && post && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
            <div className="rounded-2xl p-6 w-full max-w-lg mx-4" style={{ background: "#111", border: "2px solid rgba(184,92,56,0.55)" }}>
              <h3 className="text-white font-semibold text-sm mb-4" style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}>
                Edytuj treść posta
              </h3>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Tytuł"
                maxLength={80}
                className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors mb-3"
                style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-inter), sans-serif" }}
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={8}
                className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors resize-none mb-4"
                style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-inter), sans-serif" }}
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setEditingPost(false)}
                  className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white transition-colors"
                  style={{ background: "transparent" }}
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSavePost}
                  disabled={editSaving || !editTitle.trim() || !editContent.trim()}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
                >
                  {editSaving ? "Zapisuję..." : "Zapisz"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal edycji daty — admin only */}
        {editingDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
            <div className="rounded-2xl p-6 w-full max-w-sm mx-4" style={{ background: "#111", border: "2px solid rgba(184,92,56,0.55)" }}>
              <h3 className="text-white font-semibold text-sm mb-4" style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}>
                Edytuj datę {editingDate.type === "post" ? "posta" : "komentarza"}
              </h3>
              <input
                type="datetime-local"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors mb-4"
                style={{ background: "rgba(0,0,0,0.5)", colorScheme: "dark" }}
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setEditingDate(null)}
                  className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white transition-colors"
                  style={{ background: "transparent" }}
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSaveDate}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
                >
                  Zapisz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form komentarza */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(12,12,12,0.75)", border: "2px solid rgba(184,92,56,0.35)" }}>
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 text-xs text-[#B85C38]/70">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
              </svg>
              <span>Odpowiedź do <strong className="text-[#B85C38]">@{replyTo.nick}</strong></span>
              <button
                onClick={() => { setReplyTo(null); setComment(""); }}
                className="ml-auto text-white/30 hover:text-white transition-colors"
                style={{ background: "transparent" }}
                aria-label="Anuluj odpowiedź"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}
          <form onSubmit={handleComment} className="flex flex-col gap-3">
            {/* Admin: bot selector */}
            {isAdmin && bots.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/30">Odpowiedz jako:</span>
                <select
                  value={selectedBotId}
                  onChange={(e) => setSelectedBotId(e.target.value)}
                  className="text-xs text-white rounded-lg px-3 py-1.5 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors"
                  style={{ background: "rgba(0,0,0,0.5)", colorScheme: "dark" }}
                >
                  <option value="">Moje konto ({myNick})</option>
                  {bots.map((b) => (
                    <option key={b.id} value={b.id}>🤖 {b.nick}</option>
                  ))}
                </select>
              </div>
            )}
            <textarea
              ref={textareaRef}
              placeholder="Napisz komentarz... (@nick aby oznaczyć użytkownika)"
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (!isAdmin && /https?:\/\/[^\s]+|www\.[^\s]+/i.test(e.target.value)) {
                  setUrlError("Brak możliwości przesłania adresu URL");
                } else {
                  setUrlError("");
                }
              }}
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(e as any); }
              }}
              className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors resize-none"
              style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            />
            {urlError && <p className="text-red-400 text-xs">{urlError}</p>}
            {msg && <p className="text-[#D07A50] text-xs">{msg}</p>}
            <div className="flex justify-between items-center">
              <span className="text-white/20 text-xs">Enter — wyślij · Shift+Enter — nowa linia</span>
              <button
                type="submit"
                disabled={sending || !comment.trim() || !!urlError}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
              >
                {sending ? "Wysyłam..." : "Wyślij"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
