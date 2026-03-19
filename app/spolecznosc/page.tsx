"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  comment_count: number;
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

export default function SpolecznoscPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  function checkUrl(value: string) {
    if (!isAdmin && /https?:\/\/[^\s]+|www\.[^\s]+/i.test(value)) {
      setUrlError("Brak możliwości przesłania adresu URL");
    } else {
      setUrlError("");
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/auth/login"); return; }
      const res = await fetch("/api/auth/create-profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.profile?.is_admin) setIsAdmin(true);
    });
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    const res = await fetch("/api/community/posts");
    const data = await res.json();
    setPosts(data.posts ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSending(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSending(false); return; }

    const res = await fetch("/api/community/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ title, content }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setError(data.error ?? "Błąd — spróbuj ponownie");
      return;
    }

    setTitle("");
    setContent("");
    setShowForm(false);
    setSuccessMsg(data.message ?? "Post wysłany");
    if (data.post?.status === "approved") fetchPosts();
    setTimeout(() => setSuccessMsg(""), 5000);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none" style={{ backgroundImage: "url('/spolecznosc-bg.png')", zIndex: 0 }} />
      <div className="fixed inset-0 bg-gradient-to-t from-black via-black/75 to-black/55 pointer-events-none" style={{ zIndex: 0 }} />
      <div className="fixed inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30 pointer-events-none" style={{ zIndex: 0 }} />
      <AppSidebar />

      <div className="relative z-10 md:ml-60 flex-1 px-6 py-8 max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-white text-3xl font-bold"
              style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
            >
              Społeczność
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Dyskusje gitarowe, porady, dzielenie się wiedzą
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03]"
            style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
          >
            + Nowy post
          </button>
        </div>

        {/* Form nowego posta */}
        {showForm && (
          <div
            className="mb-6 rounded-2xl p-6"
            style={{ background: "rgba(12,12,12,0.85)", border: "2px solid rgba(184,92,56,0.55)" }}
          >
            <h2
              className="text-white font-semibold mb-4"
              style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
            >
              Nowy post
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Tytuł posta..."
                value={title}
                onChange={(e) => { setTitle(e.target.value); checkUrl(e.target.value + " " + content); }}
                className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors"
                style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                maxLength={80}
              />
              <textarea
                placeholder="Treść posta... opisz temat, zadaj pytanie lub podziel się wiedzą"
                value={content}
                onChange={(e) => { setContent(e.target.value); checkUrl(title + " " + e.target.value); }}
                rows={5}
                className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors resize-none"
                style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              />
              {urlError && (
                <p className="text-red-400 text-xs">{urlError}</p>
              )}
              {error && (
                <p className="text-red-400 text-xs">{error}</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white transition-colors"
                  style={{ background: "transparent" }}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={sending || !title.trim() || !content.trim() || !!urlError}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
                >
                  {sending ? "Wysyłam..." : "Wyślij do moderacji"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sukces */}
        {successMsg && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm text-[#D07A50] border border-[#B85C38]/30"
            style={{ background: "rgba(184,92,56,0.08)" }}>
            {successMsg}
          </div>
        )}

        {/* Lista postów */}
        {loading ? (
          <div className="flex justify-center py-16">
            <svg className="animate-spin text-[#B85C38]" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <p className="text-lg mb-2">Brak postów</p>
            <p className="text-sm">Bądź pierwszy — napisz nowy post!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => router.push(`/spolecznosc/${post.id}`)}
                className="text-left rounded-2xl p-5 transition-all duration-200 hover:scale-[1.005]"
                style={{
                  background: "rgba(12,12,12,0.75)",
                  border: "2px solid rgba(184,92,56,0.25)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(184,92,56,0.55)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(184,92,56,0.25)")}
              >
                <h2
                  className="text-white font-semibold text-base mb-2 leading-snug"
                  style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
                >
                  {post.title}
                </h2>
                <p className="text-white/50 text-sm leading-relaxed mb-3 line-clamp-2"
                  style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                  {post.content}
                </p>
                <div className="flex items-center gap-4 text-xs text-white/30">
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-md overflow-hidden flex-shrink-0" style={{ width: 18, height: 18 }}>
                      <Image src={post.author_avatar || DEFAULT_AVATAR} alt="" width={18} height={18} className="object-cover w-full h-full" />
                    </span>
                    <span className="text-[#B85C38]/70">{post.author_nick}</span>
                  </span>
                  <span>{timeAgo(post.created_at)}</span>
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    {post.comment_count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
