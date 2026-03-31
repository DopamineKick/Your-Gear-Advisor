"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSupabase } from "@/components/SupabaseProvider";

const AVATARS = [
  "/profile-avatars/avatar_black_strat.png",
  "/profile-avatars/avatar_sunburst_strat.png",
  "/profile-avatars/avatar_butterscotch_tele.png",
  "/profile-avatars/avatar_goldtop_lespaul.png",
  "/profile-avatars/avatar_red_prs.png",
  "/profile-avatars/avatar_black_ibanezsuperstrat.png",
  "/profile-avatars/avatar_red_jazzbass.png",
  "/profile-avatars/avatar_sunburst_jazbass.png",
  "/profile-avatars/avatar_black_ibanezbass.png",
];

// ─── Types ────────────────────────────────────────────────
interface Post { id: string; title: string; content: string; author_nick: string; created_at: string; status: string; }
interface BotScheduling {
  new_post: { enabled: boolean; min_delay_hours: number; max_delay_hours: number };
  reply: { enabled: boolean; min_delay_minutes: number; max_delay_minutes: number; reply_probability: number };
}
interface BotConfig {
  persona_description: string;
  topics: string[];
  system_prompt: string;
  is_active: boolean;
  scheduling: BotScheduling;
}
interface Bot { id: string; nick: string; avatar_url: string | null; bot_config: BotConfig | null; next_post_at: string | null; next_reply_at: string | null; }

const TAB_POSTS = "posts";
const TAB_BOTS = "bots";
const TAB_CONTENT = "content";
const TAB_MESSAGES = "messages";

function formatDt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatSchedule(dt: string | null) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (d <= new Date()) return "Gotowy — czeka na cron";
  return formatDt(dt);
}

/** Oblicza kiedy odpali się następny cron (12:00 UTC każdego dnia) */
function nextCronTime() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(12, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ─── BotCard ──────────────────────────────────────────────
function BotCard({ bot, token, onRefresh, posts }: {
  bot: Bot; token: string; onRefresh: () => void;
  posts: { id: string; title: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [cfg, setCfg] = useState<BotConfig>(bot.bot_config ?? {
    persona_description: "", topics: [], system_prompt: "", is_active: false,
    scheduling: {
      new_post: { enabled: true, min_delay_hours: 24, max_delay_hours: 96 },
      reply: { enabled: true, min_delay_minutes: 60, max_delay_minutes: 1440, reply_probability: 0.35 },
    },
  });
  const [avatarUrl, setAvatarUrl] = useState(bot.avatar_url ?? AVATARS[0]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [log, setLog] = useState<{ id: string; action_type: string; content: string; created_at: string }[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [topicsRaw, setTopicsRaw] = useState((bot.bot_config?.topics ?? []).join(", "));
  const [manualType, setManualType] = useState<"post" | "comment">("post");
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [manualPostId, setManualPostId] = useState("");
  const [manualSending, setManualSending] = useState(false);
  const [manualMsg, setManualMsg] = useState("");

  async function saveConfig() {
    setSaving(true);
    const res = await fetch(`/api/admin/bots/${bot.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bot_config: cfg, avatar_url: avatarUrl }),
    });
    setSaving(false);
    setSaveMsg(res.ok ? "✓ Zapisano" : "✗ Błąd");
    setTimeout(() => setSaveMsg(""), 2500);
    if (res.ok) onRefresh();
  }

  async function forceRunNow(field: "next_post_at" | "next_reply_at") {
    await fetch(`/api/admin/bots/${bot.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ [field]: new Date(Date.now() - 1000).toISOString() }),
    });
    setSaveMsg(`Ustawiono — bot wykona akcję przy następnym cronie (${nextCronTime()})`);
    setTimeout(() => setSaveMsg(""), 4000);
  }

  async function fetchLog() {
    const res = await fetch(`/api/admin/bots/${bot.id}/log`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setLog(data.log ?? []);
    setShowLog(true);
  }

  async function sendManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualContent.trim()) return;
    setManualSending(true);
    setManualMsg("");
    const body: any = { type: manualType, content: manualContent };
    if (manualType === "post") body.title = manualTitle;
    if (manualType === "comment") body.post_id = manualPostId;

    const res = await fetch(`/api/admin/bots/${bot.id}/manual-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setManualSending(false);
    setManualMsg(res.ok ? "✓ Opublikowano" : (data.error ?? "Błąd"));
    if (res.ok) { setManualTitle(""); setManualContent(""); setManualPostId(""); }
    setTimeout(() => setManualMsg(""), 3000);
  }

  const isActive = cfg.is_active;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `2px solid ${isActive ? "rgba(184,92,56,0.55)" : "rgba(255,255,255,0.1)"}` }}>
      {/* Header bota */}
      <div className="p-4 flex items-center justify-between" style={{ background: "rgba(12,12,12,0.85)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: isActive ? "2px solid rgba(184,92,56,0.5)" : "2px solid rgba(255,255,255,0.1)" }}>
            <Image src={avatarUrl} alt={bot.nick} width={32} height={32} className="object-cover w-full h-full" />
          </div>
          <div>
            <span className="text-white font-semibold text-sm">{bot.nick}</span>
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${isActive ? "text-[#D07A50] bg-[#B85C38]/15" : "text-white/30 bg-white/5"}`}>
              {isActive ? "● Aktywny" : "○ Uśpiony"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowLog(false); fetchLog(); }}
            className="text-xs text-white/40 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            Log
          </button>
          <button onClick={() => setExpanded(!expanded)}
            className="text-xs text-white/40 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            {expanded ? "Zwiń" : "Edytuj"}
          </button>
          <button
            onClick={async () => {
              if (!confirm(`Czy na pewno chcesz usunąć bota "${bot.nick}"? Ta operacja jest nieodwracalna.`)) return;
              const res = await fetch(`/api/admin/bots/${bot.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) onRefresh();
            }}
            className="text-xs text-red-500/50 hover:text-red-400 px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: "rgba(255,255,255,0.05)" }}
            title="Usuń bota"
          >
            Usuń
          </button>
        </div>
      </div>

      {/* Skrót — daty */}
      {!expanded && (
        <div className="px-4 pb-3 flex gap-4 text-xs text-white/30" style={{ background: "rgba(12,12,12,0.6)" }}>
          <span>Następny post: <span className={new Date(bot.next_post_at ?? 0) <= new Date() ? "text-[#D07A50]/70" : "text-white/50"}>{formatSchedule(bot.next_post_at)}</span></span>
          <span>Następna odpowiedź: <span className={new Date(bot.next_reply_at ?? 0) <= new Date() ? "text-[#D07A50]/70" : "text-white/50"}>{formatSchedule(bot.next_reply_at)}</span></span>
        </div>
      )}

      {/* Log */}
      {showLog && (
        <div className="px-4 pb-4" style={{ background: "rgba(5,5,5,0.9)" }}>
          <div className="flex items-center justify-between mb-2 pt-3">
            <span className="text-white/40 text-xs uppercase tracking-widest">Log aktywności</span>
            <button onClick={() => setShowLog(false)} className="text-white/30 hover:text-white text-xs" style={{ background: "transparent" }}>Zamknij</button>
          </div>
          {log.length === 0 ? (
            <p className="text-white/25 text-xs">Brak wpisów</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {log.map((l) => (
                <div key={l.id} className="flex gap-3 text-xs">
                  <span className="text-white/25 shrink-0">{formatDt(l.created_at)}</span>
                  <span className={`shrink-0 ${l.action_type.includes("manual") ? "text-[#D07A50]" : "text-white/40"}`}>{l.action_type}</span>
                  <span className="text-white/55 truncate">{l.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Panel edycji */}
      {expanded && (
        <div className="p-4 flex flex-col gap-5 border-t border-white/8" style={{ background: "rgba(8,8,8,0.9)" }}>

          {/* Aktywny toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCfg({ ...cfg, is_active: !cfg.is_active })}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: cfg.is_active ? "rgba(184,92,56,0.15)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${cfg.is_active ? "rgba(184,92,56,0.4)" : "rgba(255,255,255,0.1)"}`,
                color: cfg.is_active ? "#D07A50" : "rgba(255,255,255,0.4)",
              }}>
              {cfg.is_active ? "● Aktywny — kliknij by uśpić" : "○ Uśpiony — kliknij by aktywować"}
            </button>
          </div>

          {/* Avatar picker */}
          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">Avatar bota</label>
            <div className="grid grid-cols-9 gap-2">
              {AVATARS.map((src) => {
                const selected = avatarUrl === src;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setAvatarUrl(src)}
                    className="relative rounded-lg overflow-hidden transition-all hover:scale-[1.08]"
                    style={{
                      aspectRatio: "1",
                      border: selected ? "2px solid #B85C38" : "2px solid rgba(255,255,255,0.08)",
                      boxShadow: selected ? "0 0 0 2px rgba(184,92,56,0.3)" : "none",
                    }}
                  >
                    <Image src={src} alt="Avatar" fill className="object-cover" sizes="48px" />
                    {selected && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(184,92,56,0.25)" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Persona */}
          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">Opis persony (wewnętrzny)</label>
            <input type="text" value={cfg.persona_description}
              onChange={(e) => setCfg({ ...cfg, persona_description: e.target.value })}
              placeholder="np. Gitarzysta bluesowy z 20-letnim doświadczeniem"
              className="w-full text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors"
              style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-inter), sans-serif" }} />
          </div>

          {/* Tematy */}
          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">Tematy (oddziel przecinkiem)</label>
            <input type="text" value={topicsRaw}
              onChange={(e) => setTopicsRaw(e.target.value)}
              onBlur={(e) => setCfg({ ...cfg, topics: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
              placeholder="np. blues, Fender Telecaster, vintage gitary"
              className="w-full text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors"
              style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-inter), sans-serif" }} />
          </div>

          {/* System prompt */}
          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">System prompt (instrukcja zachowania)</label>
            <textarea value={cfg.system_prompt}
              onChange={(e) => setCfg({ ...cfg, system_prompt: e.target.value })}
              rows={6}
              className="w-full text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors resize-none"
              style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-inter), sans-serif", fontSize: "0.8rem" }} />
          </div>

          {/* Harmonogram — nowe posty */}
          <div className="rounded-xl p-4" style={{ background: "rgba(184,92,56,0.04)", border: "1px solid rgba(184,92,56,0.15)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/60 text-xs uppercase tracking-wider">Harmonogram — Nowe posty</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cfg.scheduling.new_post.enabled}
                  onChange={(e) => setCfg({ ...cfg, scheduling: { ...cfg.scheduling, new_post: { ...cfg.scheduling.new_post, enabled: e.target.checked } } })}
                  className="accent-[#B85C38]" />
                <span className="text-white/40 text-xs">włączone</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Min (godz)", field: "min_delay_hours" as const, val: cfg.scheduling.new_post.min_delay_hours },
                { label: "Max (godz)", field: "max_delay_hours" as const, val: cfg.scheduling.new_post.max_delay_hours },
              ].map(({ label, field, val }) => (
                <div key={field}>
                  <label className="text-white/30 text-xs block mb-1">{label}</label>
                  <input type="number" min={1} value={val}
                    onChange={(e) => setCfg({ ...cfg, scheduling: { ...cfg.scheduling, new_post: { ...cfg.scheduling.new_post, [field]: parseInt(e.target.value) || 1 } } })}
                    className="w-full text-white text-sm rounded-lg px-3 py-2 outline-none border border-white/10"
                    style={{ background: "rgba(0,0,0,0.5)" }} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className={`text-xs ${new Date(bot.next_post_at ?? 0) <= new Date() ? "text-[#D07A50]/70" : "text-white/30"}`}>Następny post: {formatSchedule(bot.next_post_at)}</span>
              <button onClick={() => forceRunNow("next_post_at")}
                className="text-xs text-[#B85C38] hover:text-[#D07A50] transition-colors" style={{ background: "transparent" }}>
                Napisz post przy następnym cronie →
              </button>
            </div>
          </div>

          {/* Harmonogram — odpowiedzi */}
          <div className="rounded-xl p-4" style={{ background: "rgba(184,92,56,0.04)", border: "1px solid rgba(184,92,56,0.15)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/60 text-xs uppercase tracking-wider">Harmonogram — Odpowiedzi</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cfg.scheduling.reply.enabled}
                  onChange={(e) => setCfg({ ...cfg, scheduling: { ...cfg.scheduling, reply: { ...cfg.scheduling.reply, enabled: e.target.checked } } })}
                  className="accent-[#B85C38]" />
                <span className="text-white/40 text-xs">włączone</span>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Min (min)", field: "min_delay_minutes" as const, val: cfg.scheduling.reply.min_delay_minutes },
                { label: "Max (min)", field: "max_delay_minutes" as const, val: cfg.scheduling.reply.max_delay_minutes },
                { label: "Prawdop. %", field: "reply_probability" as const, val: Math.round(cfg.scheduling.reply.reply_probability * 100), isPercent: true },
              ].map(({ label, field, val, isPercent }) => (
                <div key={field}>
                  <label className="text-white/30 text-xs block mb-1">{label}</label>
                  <input type="number" min={isPercent ? 1 : 1} max={isPercent ? 100 : undefined} value={val}
                    onChange={(e) => {
                      const n = parseInt(e.target.value) || 1;
                      const newVal = isPercent ? n / 100 : n;
                      setCfg({ ...cfg, scheduling: { ...cfg.scheduling, reply: { ...cfg.scheduling.reply, [field]: newVal } } });
                    }}
                    className="w-full text-white text-sm rounded-lg px-3 py-2 outline-none border border-white/10"
                    style={{ background: "rgba(0,0,0,0.5)" }} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className={`text-xs ${new Date(bot.next_reply_at ?? 0) <= new Date() ? "text-[#D07A50]/70" : "text-white/30"}`}>Następna odpowiedź: {formatSchedule(bot.next_reply_at)}</span>
              <button onClick={() => forceRunNow("next_reply_at")}
                className="text-xs text-[#B85C38] hover:text-[#D07A50] transition-colors" style={{ background: "transparent" }}>
                Skomentuj post przy następnym cronie →
              </button>
            </div>
          </div>

          {/* Zapis */}
          <div className="flex items-center gap-3">
            <button onClick={saveConfig} disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}>
              {saving ? "Zapisuję..." : "Zapisz konfigurację"}
            </button>
            {saveMsg && <span className="text-xs text-[#D07A50]">{saveMsg}</span>}
          </div>

          {/* Ręczny post / komentarz */}
          <div className="border-t border-white/8 pt-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Napisz ręcznie jako ten bot</p>
            <div className="flex gap-2 mb-3">
              {(["post", "comment"] as const).map((t) => (
                <button key={t} onClick={() => setManualType(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: manualType === t ? "rgba(184,92,56,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${manualType === t ? "rgba(184,92,56,0.5)" : "rgba(255,255,255,0.1)"}`,
                    color: manualType === t ? "#D07A50" : "rgba(255,255,255,0.4)",
                  }}>
                  {t === "post" ? "Nowy post" : "Komentarz"}
                </button>
              ))}
            </div>
            <form onSubmit={sendManual} className="flex flex-col gap-2">
              {manualType === "post" && (
                <input type="text" placeholder="Tytuł posta..." value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors"
                  style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-inter), sans-serif" }} />
              )}
              {manualType === "comment" && posts.length > 0 && (
                <select value={manualPostId} onChange={(e) => setManualPostId(e.target.value)}
                  className="w-full text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-white/10"
                  style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-inter), sans-serif" }}>
                  <option value="">— wybierz post —</option>
                  {posts.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              )}
              <textarea placeholder={manualType === "post" ? "Treść posta..." : "Treść komentarza..."}
                value={manualContent} onChange={(e) => setManualContent(e.target.value)} rows={3}
                className="w-full text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors resize-none"
                style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-inter), sans-serif" }} />
              {manualMsg && <span className="text-xs text-[#D07A50]">{manualMsg}</span>}
              <button type="submit" disabled={manualSending || !manualContent.trim()}
                className="self-end px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}>
                {manualSending ? "Wysyłam..." : "Opublikuj jako bot"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Content helpers ──────────────────────────────────────
function toSlug(title: string) {
  return title.toLowerCase()
    .replace(/ą/g, "a").replace(/ę/g, "e").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ł/g, "l").replace(/ż/g, "z")
    .replace(/ź/g, "z").replace(/ć/g, "c").replace(/ń/g, "n")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface ContentItem { id: string; type: string; slug: string; title: string; excerpt: string; sort_order: number; content?: string; }
type FormState = { type: "guide" | "article"; slug: string; title: string; excerpt: string; content: string; sort_order: number };
const EMPTY_FORM: FormState = { type: "guide", slug: "", title: "", excerpt: "", content: "", sort_order: 999 };

function ContentSection({ token }: { token: string }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null); // null = new
  const [showFormType, setShowFormType] = useState<"guide" | "article" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/content", { headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    setItems(d.items ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew(type: "guide" | "article") {
    setEditId(null);
    setForm({ ...EMPTY_FORM, type });
    setShowFormType(type);
    setMsg("");
    setPreview(false);
  }

  async function openEdit(item: ContentItem) {
    // fetch full content
    const res = await fetch(`/api/content/${item.slug}?type=${item.type}`);
    const d = await res.json();
    setForm({ type: item.type as "guide" | "article", slug: item.slug, title: item.title, excerpt: item.excerpt, content: d.item?.content ?? "", sort_order: item.sort_order });
    setEditId(item.id);
    setShowFormType(item.type as "guide" | "article");
    setMsg("");
    setPreview(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.slug || !form.content) { setMsg("Tytuł, slug i treść są wymagane"); return; }
    setSaving(true);
    setMsg("");
    const url = editId ? `/api/admin/content/${editId}` : "/api/admin/content";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg(d.error ?? "Błąd zapisu"); return; }
    setMsg("✓ Zapisano");
    setShowFormType(null);
    setEditId(null);
    load();
    setTimeout(() => setMsg(""), 3000);
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Usunąć „${title}"?`)) return;
    await fetch(`/api/admin/content/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    load();
  }

  const guides = items.filter((i) => i.type === "guide");
  const articles = items.filter((i) => i.type === "article");

  function renderList(list: ContentItem[], type: "guide" | "article") {
    const label = type === "guide" ? "Poradniki zakupowe" : "Artykuły i ciekawostki";
    const addLabel = type === "guide" ? "+ Dodaj poradnik" : "+ Dodaj artykuł";
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/40 text-xs uppercase tracking-widest">{label}</p>
          <button onClick={() => openNew(type)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}>
            {addLabel}
          </button>
        </div>
        {list.length === 0 ? (
          <p className="text-white/20 text-sm py-4 text-center">Brak wpisów</p>
        ) : (
          <div className="flex flex-col gap-2">
            {list.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
                style={{ background: "rgba(12,12,12,0.7)", border: "1px solid rgba(184,92,56,0.2)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.title}</p>
                  <p className="text-white/30 text-xs font-mono">{item.slug}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(item)}
                    className="px-3 py-1 rounded-lg text-xs text-white/60 hover:text-white transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    Edytuj
                  </button>
                  <button onClick={() => handleDelete(item.id, item.title)}
                    className="px-3 py-1 rounded-lg text-xs transition-colors"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                    Usuń
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {msg && <p className={`text-xs mb-4 ${msg.startsWith("✓") ? "text-[#D07A50]" : "text-red-400"}`}>{msg}</p>}

      {loading ? (
        <div className="flex justify-center py-12"><svg className="animate-spin text-[#B85C38]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg></div>
      ) : (
        <>
          {renderList(guides, "guide")}
          {renderList(articles, "article")}
        </>
      )}

      {/* ── Formularz dodawania / edycji ── */}
      {showFormType && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4 pb-10 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-3xl rounded-2xl p-6" style={{ background: "#0e0e0e", border: "2px solid rgba(184,92,56,0.4)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold" style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}>
                {editId ? "Edytuj wpis" : (showFormType === "guide" ? "Nowy poradnik" : "Nowy artykuł")}
              </h2>
              <button onClick={() => setShowFormType(null)} className="text-white/40 hover:text-white transition-colors text-xl">✕</button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {/* Tytuł */}
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">Tytuł</label>
                <input type="text" value={form.title} required maxLength={200}
                  onChange={(e) => {
                    const t = e.target.value;
                    setForm((f) => ({ ...f, title: t, slug: editId ? f.slug : toSlug(t) }));
                  }}
                  className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors"
                  style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-inter), sans-serif" }} />
              </div>

              {/* Slug */}
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">Slug (URL) <span className="text-white/20 normal-case tracking-normal">— auto-generowany, można zmienić</span></label>
                <input type="text" value={form.slug} required
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  className="w-full text-white/80 text-sm rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors font-mono"
                  style={{ background: "rgba(0,0,0,0.5)" }} />
              </div>

              {/* Excerpt */}
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">Krótki opis (excerpt) <span className="text-white/20 normal-case tracking-normal">— widoczny na liście</span></label>
                <textarea value={form.excerpt} rows={2} maxLength={400}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors resize-none"
                  style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-inter), sans-serif" }} />
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-white/40 text-xs uppercase tracking-wider">Treść (Markdown)</label>
                  <button type="button" onClick={() => setPreview((p) => !p)}
                    className="text-xs text-[#B85C38]/70 hover:text-[#B85C38] transition-colors">
                    {preview ? "← Edytuj" : "Podgląd →"}
                  </button>
                </div>
                {preview ? (
                  <div className="w-full min-h-[300px] rounded-xl px-4 py-3 text-sm space-y-2 overflow-y-auto"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", maxHeight: 400 }}>
                    {form.content.split("\n").filter(Boolean).map((para, i) => {
                      if (para.startsWith("**") && para.endsWith("**"))
                        return <p key={i} className="text-[#D07A50] font-semibold">{para.replace(/\*\*/g, "")}</p>;
                      if (para.startsWith("- "))
                        return <p key={i} className="text-white/60 pl-3"><span className="text-[#B85C38] mr-1">–</span>{para.slice(2)}</p>;
                      if (/^\d+\./.test(para))
                        return <p key={i} className="text-white/60 pl-3"><span className="text-[#B85C38] mr-1">•</span>{para.replace(/^\d+\. /, "")}</p>;
                      return <p key={i} className="text-white/65">{para.replace(/\*\*(.+?)\*\*/g, "$1")}</p>;
                    })}
                  </div>
                ) : (
                  <textarea value={form.content} rows={14} required
                    placeholder={"**Nagłówek sekcji**\n\nAkapit treści...\n\n- Element listy\n- Kolejny element\n\n1. Numerowany punkt\n2. Kolejny punkt"}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors resize-y font-mono"
                    style={{ background: "rgba(0,0,0,0.5)", minHeight: 300 }} />
                )}
                <p className="text-white/20 text-xs mt-1.5">
                  Formatowanie: <code className="text-white/40">**Nagłówek**</code> → śródtytuł &nbsp;|&nbsp; <code className="text-white/40">**tekst**</code> → pogrubienie (w środku akapitu) &nbsp;|&nbsp; <code className="text-white/40">- tekst</code> → lista &nbsp;|&nbsp; <code className="text-white/40">1. tekst</code> → lista numerowana
                </p>
              </div>

              {msg && <p className={`text-xs ${msg.startsWith("✓") ? "text-[#D07A50]" : "text-red-400"}`}>{msg}</p>}

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowFormType(null)}
                  className="px-5 py-2.5 rounded-xl text-sm text-white/40 hover:text-white transition-colors">
                  Anuluj
                </button>
                <button type="submit" disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}>
                  {saving ? "Zapisuję..." : (editId ? "Zapisz zmiany" : "Opublikuj")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MessagesSection ───────────────────────────────────────
function MessagesSection({ token }: { token: string }) {
  const [content, setContent] = useState("");
  const [target, setTarget] = useState<"all" | "user">("all");
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    setMsg("");
    const res = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        content: content.trim(),
        target,
        ...(target === "user" ? { nick: recipient.trim() } : {}),
      }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { setMsg(`Błąd: ${data.error}`); return; }
    setMsg(data.message ?? "Wysłano");
    setContent("");
    setRecipient("");
    setTimeout(() => setMsg(""), 5000);
  }

  const inputStyle = { background: "rgba(12,12,12,0.8)", fontFamily: "var(--font-inter), sans-serif" };

  return (
    <div className="max-w-lg">
      <p className="text-white/40 text-sm mb-5">
        Wyślij komunikat do wszystkich użytkowników lub do konkretnej osoby po nicku.
      </p>
      <form onSubmit={handleSend} className="flex flex-col gap-4">
        {/* Target selector */}
        <div className="flex gap-3">
          {(["all", "user"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTarget(t)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: target === t ? "rgba(184,92,56,0.15)" : "rgba(255,255,255,0.04)",
                color: target === t ? "#D07A50" : "rgba(255,255,255,0.4)",
                border: `1px solid ${target === t ? "rgba(184,92,56,0.35)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {t === "all" ? "Wszyscy użytkownicy" : "Konkretny użytkownik"}
            </button>
          ))}
        </div>

        {/* Recipient input */}
        {target === "user" && (
          <input
            type="text"
            placeholder="Nick użytkownika"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full text-white text-sm rounded-xl px-4 py-2.5 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors"
            style={inputStyle}
          />
        )}

        {/* Message content */}
        <textarea
          placeholder="Treść komunikatu..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors resize-none"
          style={inputStyle}
        />

        {msg && (
          <p className={`text-xs ${msg.startsWith("Błąd") ? "text-red-400" : "text-[#D07A50]"}`}>
            {msg}
          </p>
        )}

        <button
          type="submit"
          disabled={sending || !content.trim() || (target === "user" && !recipient.trim())}
          className="self-start px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
        >
          {sending ? "Wysyłam..." : "Wyślij komunikat"}
        </button>
      </form>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [token, setToken] = useState("");
  const [tab, setTab] = useState<typeof TAB_POSTS | typeof TAB_BOTS | typeof TAB_CONTENT | typeof TAB_MESSAGES>(TAB_POSTS);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsTab, setPostsTab] = useState<"pending" | "approved">("pending");

  const [bots, setBots] = useState<Bot[]>([]);
  const [botsLoading, setBotsLoading] = useState(false);
  const [approvedPosts, setApprovedPosts] = useState<{ id: string; title: string }[]>([]);

  const [newBotNick, setNewBotNick] = useState("");
  const [creatingBot, setCreatingBot] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/auth/login"); return; }
      const t = session.access_token;
      setToken(t);

      // Sprawdź is_admin
      const res = await fetch("/api/admin/posts?status=pending", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 403) { router.replace("/onboarding"); return; }
      setAuthorized(true);
      setLoading(false);
      loadPosts(t, "pending");
    });
  }, []);

  async function loadPosts(t: string, status: string) {
    setPostsLoading(true);
    const res = await fetch(`/api/admin/posts?status=${status}`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setPendingPosts(data.posts ?? []);
    setPostsLoading(false);
  }

  async function loadBots(t: string) {
    setBotsLoading(true);
    const [botsRes, postsRes] = await Promise.all([
      fetch("/api/admin/bots", { headers: { Authorization: `Bearer ${t}` } }),
      fetch("/api/community/posts"),
    ]);
    const botsData = await botsRes.json();
    const postsData = await postsRes.json();
    setBots(botsData.bots ?? []);
    setApprovedPosts((postsData.posts ?? []).map((p: any) => ({ id: p.id, title: p.title })));
    setBotsLoading(false);
  }

  useEffect(() => {
    if (!authorized || !token) return;
    if (tab === TAB_BOTS) loadBots(token);
    else loadPosts(token, postsTab);
  }, [tab, authorized, token, postsTab]);

  async function handleApprove(id: string) {
    await fetch(`/api/admin/posts/${id}/approve`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    setPendingPosts((p) => p.filter((x) => x.id !== id));
  }

  async function handleReject(id: string) {
    await fetch(`/api/admin/posts/${id}/reject`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    setPendingPosts((p) => p.filter((x) => x.id !== id));
  }

  async function handleDeletePost(id: string) {
    if (!confirm("Trwale usunąć ten post?")) return;
    await fetch(`/api/admin/posts/${id}/delete`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    setPendingPosts((p) => p.filter((x) => x.id !== id));
  }

  async function createBot(e: React.FormEvent) {
    e.preventDefault();
    if (!newBotNick.trim()) return;
    setCreatingBot(true);
    setCreateMsg("");
    const res = await fetch("/api/admin/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nick: newBotNick.trim() }),
    });
    const data = await res.json();
    setCreatingBot(false);
    if (!res.ok) { setCreateMsg(data.error ?? "Błąd"); return; }
    setNewBotNick("");
    setCreateMsg("✓ Bot utworzony");
    loadBots(token);
    setTimeout(() => setCreateMsg(""), 3000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <svg className="animate-spin text-[#B85C38]" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-white text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}>
              Panel Admina
            </h1>
            <p className="text-white/30 text-sm">Your Gear Advisor — zarządzanie Społecznością i botami</p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white transition-colors flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Wstecz
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {[
            { key: TAB_POSTS, label: "Moderacja postów" },
            { key: TAB_BOTS, label: "Boty" },
            { key: TAB_CONTENT, label: "Treści" },
            { key: TAB_MESSAGES, label: "Komunikaty" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key as any)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: tab === key ? "rgba(184,92,56,0.15)" : "transparent",
                color: tab === key ? "#D07A50" : "rgba(255,255,255,0.4)",
                border: `1px solid ${tab === key ? "rgba(184,92,56,0.35)" : "transparent"}`,
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── POSTY ── */}
        {tab === TAB_POSTS && (
          <div>
            <div className="flex gap-2 mb-4">
              {(["pending", "approved"] as const).map((s) => (
                <button key={s} onClick={() => setPostsTab(s)}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: postsTab === s ? "rgba(184,92,56,0.15)" : "rgba(255,255,255,0.05)",
                    color: postsTab === s ? "#D07A50" : "rgba(255,255,255,0.35)",
                    border: `1px solid ${postsTab === s ? "rgba(184,92,56,0.3)" : "transparent"}`,
                  }}>
                  {s === "pending" ? "Oczekujące" : "Zatwierdzone"}
                </button>
              ))}
            </div>

            {postsLoading ? (
              <div className="flex justify-center py-12"><svg className="animate-spin text-[#B85C38]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg></div>
            ) : pendingPosts.length === 0 ? (
              <p className="text-center text-white/25 py-12 text-sm">Brak postów</p>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingPosts.map((p) => (
                  <div key={p.id} className="rounded-2xl p-5" style={{ background: "rgba(12,12,12,0.85)", border: "2px solid rgba(184,92,56,0.2)" }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm mb-1" style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}>{p.title}</h3>
                        <p className="text-white/50 text-xs leading-relaxed mb-2 line-clamp-3">{p.content}</p>
                        <span className="text-[#B85C38]/60 text-xs">{p.author_nick}</span>
                      </div>
                      {postsTab === "pending" && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleApprove(p.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-[1.03]"
                            style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}>
                            Zatwierdź
                          </button>
                          <button onClick={() => handleReject(p.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                            Odrzuć
                          </button>
                        </div>
                      )}
                      {postsTab === "approved" && (
                        <button onClick={() => handleDeletePost(p.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0"
                          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                          Usuń
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TREŚCI ── */}
        {tab === TAB_CONTENT && <ContentSection token={token} />}

        {/* ── KOMUNIKATY ── */}
        {tab === TAB_MESSAGES && (
          <MessagesSection token={token} />
        )}

        {/* ── BOTY ── */}
        {tab === TAB_BOTS && (
          <div>
            {/* Utwórz nowego bota */}
            <form onSubmit={createBot} className="flex gap-3 mb-6">
              <input type="text" placeholder="Nick nowego bota (a-z, 0-9, _)" value={newBotNick}
                onChange={(e) => setNewBotNick(e.target.value)}
                className="flex-1 text-white text-sm rounded-xl px-4 py-2.5 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors"
                style={{ background: "rgba(12,12,12,0.8)", fontFamily: "var(--font-inter), sans-serif" }} />
              <button type="submit" disabled={creatingBot || !newBotNick.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}>
                {creatingBot ? "Tworzę..." : "+ Utwórz bota"}
              </button>
            </form>
            {createMsg && <p className="text-[#D07A50] text-xs mb-4">{createMsg}</p>}

            {botsLoading ? (
              <div className="flex justify-center py-12"><svg className="animate-spin text-[#B85C38]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg></div>
            ) : bots.length === 0 ? (
              <p className="text-center text-white/25 py-12 text-sm">Brak botów — utwórz pierwszego</p>
            ) : (
              <div className="flex flex-col gap-4">
                {bots.map((bot) => (
                  <BotCard key={bot.id} bot={bot} token={token} onRefresh={() => loadBots(token)} posts={approvedPosts} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
