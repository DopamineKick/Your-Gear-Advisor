"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  comment_count: number;
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

export default function SpolecznoscPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingDate, setEditingDate] = useState<{ id: string; created_at: string } | null>(null);
  const [dateValue, setDateValue] = useState("");

  // Admin: bot selector for new post
  const [bots, setBots] = useState<{ id: string; nick: string; avatar_url: string | null }[]>([]);
  const [selectedBotId, setSelectedBotId] = useState("");

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPosts, setSearchPosts] = useState(true);
  const [searchComments, setSearchComments] = useState(false);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [checkboxError, setCheckboxError] = useState(false);

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
      if (data.profile?.is_admin) {
        setIsAdmin(true);
        // Fetch bots for admin
        fetch("/api/admin/bots", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then((r) => r.json())
          .then((d) => setBots(d.bots ?? []))
          .catch(() => {});
      }
    });
    fetchPosts();
  }, []);

  async function fetchPosts(tags?: string[], search?: string, inclPosts?: boolean, inclComments?: boolean) {
    setLoading(true);
    const params = new URLSearchParams();
    const t = tags ?? filterTags;
    const s = search !== undefined ? search : searchQuery;
    const sp = inclPosts !== undefined ? inclPosts : searchPosts;
    const sc = inclComments !== undefined ? inclComments : searchComments;
    if (t.length > 0) params.set("tags", t.join(","));
    if (s.trim()) {
      params.set("search", s.trim());
      if (sc) params.set("search_comments", "true");
      if (!sp) params.set("posts_search", "false");
    }

    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

    const res = await fetch(`/api/community/posts?${params.toString()}`, { headers });
    const data = await res.json();
    setPosts(data.posts ?? []);
    setLoading(false);
  }

  function handleTagFilter(tag: string) {
    const newTags = filterTags.includes(tag)
      ? filterTags.filter((t) => t !== tag)
      : [...filterTags, tag];
    setFilterTags(newTags);
    fetchPosts(newTags);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchPosts && !searchComments) {
      setCheckboxError(true);
      return;
    }
    setCheckboxError(false);
    fetchPosts();
  }

  function handleSearchPostsToggle(checked: boolean) {
    if (!checked && !searchComments) {
      setCheckboxError(true);
      return;
    }
    setCheckboxError(false);
    setSearchPosts(checked);
  }

  function handleSearchCommentsToggle(checked: boolean) {
    if (!checked && !searchPosts) {
      setCheckboxError(true);
      return;
    }
    setCheckboxError(false);
    setSearchComments(checked);
  }

  function clearFilters() {
    setFilterTags([]);
    setSearchQuery("");
    setSearchPosts(true);
    setSearchComments(false);
    setCheckboxError(false);
    fetchPosts([], "", true, false);
  }

  function toggleFormTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleLike(postId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const isUnliking = isAdmin && post.user_liked;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, like_count: isUnliking ? p.like_count - 1 : p.like_count + 1, user_liked: !isUnliking }
          : p
      )
    );

    const res = await fetch("/api/community/likes", {
      method: isUnliking ? "DELETE" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ target_type: "post", target_id: postId }),
    });

    if (!res.ok) {
      // Revert on failure
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, like_count: isUnliking ? p.like_count + 1 : p.like_count - 1, user_liked: isUnliking }
            : p
        )
      );
    }
  }

  async function handleDeletePost(postId: string) {
    if (!window.confirm("Usunąć ten post? Tej akcji nie można cofnąć.")) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/community/posts/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    if (selectedTags.length === 0) {
      setError("Wybierz co najmniej jeden tag do posta");
      return;
    }
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
      body: JSON.stringify({
        title,
        content,
        tags: selectedTags,
        ...(selectedBotId ? { as_bot_id: selectedBotId } : {}),
      }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setError(data.error ?? "Błąd — spróbuj ponownie");
      return;
    }

    setTitle("");
    setContent("");
    setSelectedTags([]);
    setSelectedBotId("");
    setShowForm(false);
    setSuccessMsg(data.message ?? "Post wysłany");
    if (data.post?.status === "approved") fetchPosts();
    setTimeout(() => setSuccessMsg(""), 5000);
  }

  function openDateEditor(postId: string, currentDate: string) {
    const d = new Date(currentDate);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDateValue(local);
    setEditingDate({ id: postId, created_at: currentDate });
  }

  async function handleSaveDate() {
    if (!editingDate || !dateValue) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/community/posts/${editingDate.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ created_at: new Date(dateValue).toISOString() }),
    });

    if (res.ok) {
      const newDate = new Date(dateValue).toISOString();
      setPosts((prev) =>
        prev.map((p) => (p.id === editingDate.id ? { ...p, created_at: newDate } : p))
      );
      setEditingDate(null);
    }
  }

  const hasActiveFilters = filterTags.length > 0 || searchQuery.trim() !== "";

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none" style={{ backgroundImage: "url('/spolecznosc-bg.png')", zIndex: 0 }} />
      <div className="fixed inset-0 bg-gradient-to-t from-black via-black/75 to-black/55 pointer-events-none" style={{ zIndex: 0 }} />
      <div className="fixed inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30 pointer-events-none" style={{ zIndex: 0 }} />
      <AppSidebar />

      <div className="relative z-10 md:ml-60 flex-1 px-6 py-8 max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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

        {/* Search bar */}
        <div className="mb-4">
          <form onSubmit={handleSearch} className="flex gap-2 items-center">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Szukaj postów..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-white text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors"
                style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
            >
              Szukaj
            </button>
          </form>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={searchPosts}
                onChange={(e) => handleSearchPostsToggle(e.target.checked)}
                className="accent-[#B85C38] w-3.5 h-3.5"
              />
              <span className="text-white/50">Szukaj wśród postów</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={searchComments}
                onChange={(e) => handleSearchCommentsToggle(e.target.checked)}
                className="accent-[#B85C38] w-3.5 h-3.5"
              />
              <span className="text-white/40">Szukaj wśród komentarzy</span>
            </label>
            {checkboxError && (
              <span className="text-red-400 text-xs">jedna z opcji musi być zaznaczona</span>
            )}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-[#B85C38]/70 hover:text-[#B85C38] transition-colors ml-auto"
                style={{ background: "transparent" }}
              >
                Wyczyść filtry
              </button>
            )}
          </div>
        </div>

        {/* Tag filter — ukryty za przyciskiem */}
        <div className="mb-6">
          <button
            onClick={() => setShowTagFilter(!showTagFilter)}
            className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors mb-3"
            style={{ background: "transparent" }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${showTagFilter ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            {showTagFilter ? "Ukryj wyszukiwanie po tagach" : "Pokaż wyszukiwanie po tagach"}
            {filterTags.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(184,92,56,0.3)", color: "#D07A50" }}>
                {filterTags.length}
              </span>
            )}
          </button>

          {showTagFilter && (
            <div className="flex flex-wrap gap-2">
              {(showAllTags ? ALL_TAGS : ALL_TAGS.slice(0, 10)).map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagFilter(tag)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{
                    background: filterTags.includes(tag)
                      ? "rgba(184,92,56,0.3)"
                      : "rgba(255,255,255,0.05)",
                    border: filterTags.includes(tag)
                      ? "1px solid rgba(184,92,56,0.6)"
                      : "1px solid rgba(255,255,255,0.1)",
                    color: filterTags.includes(tag) ? "#D07A50" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {tag}
                </button>
              ))}
              {ALL_TAGS.length > 10 && (
                <button
                  onClick={() => setShowAllTags(!showAllTags)}
                  className="px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-white/50 transition-colors"
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {showAllTags ? "Mniej tagów" : `+${ALL_TAGS.length - 10} więcej`}
                </button>
              )}
            </div>
          )}
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
              {/* Admin: bot selector */}
              {isAdmin && bots.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30">Napisz jako:</span>
                  <select
                    value={selectedBotId}
                    onChange={(e) => setSelectedBotId(e.target.value)}
                    className="text-xs text-white rounded-lg px-3 py-1.5 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors"
                    style={{ background: "rgba(0,0,0,0.5)", colorScheme: "dark" }}
                  >
                    <option value="">Moje konto (admin)</option>
                    {bots.map((b) => (
                      <option key={b.id} value={b.id}>🤖 {b.nick}</option>
                    ))}
                  </select>
                </div>
              )}

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

              {/* Tag selector — wymagane */}
              <div>
                <p className="text-xs text-white/40 mb-2">
                  Tagi (dopasuj tagi aby ułatwić późniejsze wyszukiwanie Twojego posta):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleFormTag(tag)}
                      className="px-2.5 py-1 rounded-md text-xs transition-all"
                      style={{
                        background: selectedTags.includes(tag)
                          ? "rgba(184,92,56,0.3)"
                          : "rgba(255,255,255,0.05)",
                        border: selectedTags.includes(tag)
                          ? "1px solid rgba(184,92,56,0.6)"
                          : "1px solid rgba(255,255,255,0.08)",
                        color: selectedTags.includes(tag) ? "#D07A50" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {urlError && (
                <p className="text-red-400 text-xs">{urlError}</p>
              )}
              {error && (
                <p className="text-red-400 text-xs">{error}</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(""); }}
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
            <p className="text-lg mb-2">{hasActiveFilters ? "Brak wyników" : "Brak postów"}</p>
            <p className="text-sm">{hasActiveFilters ? "Spróbuj zmienić kryteria wyszukiwania" : "Bądź pierwszy — napisz nowy post!"}</p>
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
                <p className="text-white/50 text-sm leading-relaxed mb-2 line-clamp-2"
                  style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                  {post.content}
                </p>

                {/* Tags on post card */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {post.tags.map((tag) => (
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
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-white/30">
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-md overflow-hidden flex-shrink-0" style={{ width: 18, height: 18 }}>
                      <Image src={post.author_avatar || DEFAULT_AVATAR} alt="" width={18} height={18} className="object-cover w-full h-full" />
                    </span>
                    <span className="text-[#B85C38]/70">{post.author_nick}</span>
                  </span>
                  <span>{timeAgo(post.created_at)}</span>

                  {/* Like button */}
                  <span
                    className="flex items-center gap-1 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!post.user_liked || isAdmin) handleLike(post.id);
                    }}
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

                  {/* Comment count */}
                  <span className="flex items-center gap-1.5 text-white/40 text-base font-medium">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    {post.comment_count}
                  </span>

                  {isAdmin && (
                    <div className="ml-auto flex items-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDateEditor(post.id, post.created_at); }}
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
                        onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                        className="text-xs text-red-500/50 hover:text-red-400 transition-colors flex items-center gap-1"
                        style={{ background: "transparent" }}
                        title="Usuń post (admin)"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                        Usuń
                      </button>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Modal edycji daty — admin only */}
        {editingDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
            <div className="rounded-2xl p-6 w-full max-w-sm mx-4" style={{ background: "#111", border: "2px solid rgba(184,92,56,0.55)" }}>
              <h3 className="text-white font-semibold text-sm mb-4" style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}>
                Edytuj datę posta
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
      </div>
    </div>
  );
}
