"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { AppSidebar } from "@/components/AppSidebar";
import { useSupabase } from "@/components/SupabaseProvider";

const DEFAULT_AVATAR = "/profile-avatars/avatar_black_strat.png";

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_nick: string;
  author_avatar?: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  author_nick: string;
  author_avatar?: string | null;
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
  const [replyTo, setReplyTo] = useState<{ id: string; nick: string } | null>(null);
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
      }
    });
    fetchPost();
  }, [postId]);

  async function fetchPost() {
    setLoading(true);
    const res = await fetch(`/api/community/posts/${postId}`);
    if (!res.ok) { router.replace("/spolecznosc"); return; }
    const data = await res.json();
    setPost(data.post);
    setComments(data.comments ?? []);
    setLoading(false);
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
      setComments((prev) => [...prev, {
        id: data.comment.id,
        content: data.comment.content,
        created_at: data.comment.created_at,
        parent_id: replyTo?.id ?? null,
        author_nick: myNick,
        author_avatar: myAvatar,
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
            <button
              onClick={() => handleReply(c)}
              className="ml-auto text-xs text-white/30 hover:text-[#B85C38] transition-colors flex items-center gap-1"
              style={{ background: "transparent" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
              </svg>
              Odpowiedz
            </button>
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
            <div className="flex items-center gap-3 text-xs text-white/30 border-t border-white/8 pt-4">
              <span className="flex items-center gap-1.5">
                <span className="rounded-md overflow-hidden flex-shrink-0" style={{ width: 20, height: 20 }}>
                  <Image src={post.author_avatar || DEFAULT_AVATAR} alt="" width={20} height={20} className="object-cover w-full h-full" />
                </span>
                <span className="text-[#B85C38]/70">{post.author_nick}</span>
              </span>
              <span>{timeAgo(post.created_at)}</span>
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
