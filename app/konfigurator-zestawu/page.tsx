"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { AppSidebar } from "@/components/AppSidebar";
import { useConfigurator } from "@/app/hooks/useConfigurator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ── Icons ── */
function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

type Message = { role: "user" | "assistant"; content: string };

export default function KonfiguratorZestawuPage() {
  const { items, lastRemoved, removeFromConfigurator, restoreLastRemoved } = useConfigurator();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/konfigurator-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          messages: newMessages,
          products: items.map((i) => ({
            name: i.name,
            price: i.latest_scraped_price?.price ?? i.price ?? null,
            description: i.ai_reason ?? i.description ?? "",
          })),
        }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply ?? "Brak odpowiedzi." }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Błąd połączenia z asystentem." }]);
    } finally {
      setLoading(false);
    }
  }

  const itemCount = items.length;
  const countLabel = itemCount === 1 ? "produkt" : itemCount < 5 ? "produkty" : "produktów";

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] relative"
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <AppSidebar />

      {/* Fixed background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url('/konfigurator-bg.png')", zIndex: 0 }}
      />
      <div className="fixed inset-0 bg-gradient-to-t from-black via-black/80 to-black/60 pointer-events-none" style={{ zIndex: 0 }} />

      {/* Header */}
      <header
        className="fixed top-0 left-0 md:left-60 right-0 z-30 backdrop-blur-xl border-b"
        style={{ background: "rgba(0,0,0,0.85)", borderColor: "rgba(184,92,56,0.15)" }}
      >
        <div className="px-4 md:px-6 h-14 flex items-center">
          <div className="w-10 md:hidden flex-shrink-0" />
          <span className="text-white/80 text-sm font-medium" style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}>
            Konfigurator zestawu gitarowego
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 md:ml-60 pt-14 min-h-screen flex flex-col">

        {/* Title */}
        <div className="px-6 pt-10 pb-6 text-center">
          <h1
            className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight"
            style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
          >
            Twój osobisty <span className="text-[#B85C38]">konfigurator</span> zestawu
          </h1>
          <p className="text-white/50 text-sm">
            Dodaj produkty z wyszukiwarki, a następnie zapytaj asystenta o kompatybilność zestawu.
          </p>
        </div>

        {/* Two columns */}
        <div className="flex-1 px-4 md:px-6 pb-10 grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-5 items-start">

          {/* LEFT — product list */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(0,0,0,0.55)", border: "2px solid rgba(184,92,56,0.55)" }}
          >
            <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(184,92,56,0.25)" }}>
              <h2
                className="text-white font-semibold text-lg"
                style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
              >
                Twój zestaw
              </h2>
              <p className="text-white/35 text-xs mt-0.5">{itemCount} {countLabel}</p>
            </div>

            <div className="p-4 flex flex-col gap-3 min-h-[160px]">
              {itemCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                  </svg>
                  <p className="text-white/30 text-sm">Brak produktów w konfiguratorze.</p>
                  <p className="text-white/20 text-xs mt-1">Dodaj produkty z wyszukiwarki.</p>
                </div>
              ) : (
                items.map((item: any) => {
                  const key = item.id ?? item.name;
                  const price = item.latest_scraped_price?.price ?? item.price ?? null;
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(184,92,56,0.12)" }}
                    >
                      {/* Thumbnail */}
                      <div
                        className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-1" />
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                          </svg>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium leading-tight truncate">{item.name}</p>
                        {price && (
                          <p className="text-[#B85C38] text-xs mt-0.5">{price} zł</p>
                        )}
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromConfigurator(key)}
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
                        title="Usuń z konfiguratora"
                        style={{ background: "transparent", boxShadow: "none", border: "none", padding: 0 }}
                      >
                        <XIcon />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Restore button */}
            {lastRemoved && (
              <div className="px-4 pb-4">
                <button
                  onClick={restoreLastRemoved}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm text-white/60 hover:text-white transition-all"
                  style={{ border: "1px dashed rgba(184,92,56,0.3)", background: "rgba(184,92,56,0.04)", boxShadow: "none" }}
                >
                  <UndoIcon />
                  Przywróć ostatnio usunięty produkt
                </button>
              </div>
            )}
          </div>

          {/* RIGHT — AI chat */}
          <div
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "rgba(0,0,0,0.55)", border: "2px solid rgba(184,92,56,0.55)", minHeight: "520px" }}
          >
            {/* Chat header */}
            <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: "rgba(184,92,56,0.15)" }}>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(184,92,56,0.15)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-white font-semibold text-sm" style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}>
                  Asystent zestawu
                </h2>
                <p className="text-white/35 text-xs">Analizuje Twój zestaw na podstawie wiedzy ogólnej</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4" style={{ maxHeight: "420px" }}>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center h-full">
                  <p className="text-white/30 text-sm">Zadaj pytanie o swój zestaw.</p>
                  <p className="text-white/20 text-xs mt-2 max-w-xs leading-relaxed">
                    Np. &quot;Czy ten zestaw nada się na próbę z perkusją?&quot; albo &quot;Czy da się podłączyć tę kolumnę do tego wzmacniacza?&quot;
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                    style={
                      msg.role === "user"
                        ? { background: "rgba(184,92,56,0.15)", border: "1px solid rgba(184,92,56,0.3)", color: "rgba(255,255,255,0.9)" }
                        : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)" }
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div
                    className="rounded-2xl px-4 py-3 flex gap-1.5 items-center"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full bg-[#B85C38] animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-3 border-t" style={{ borderColor: "rgba(184,92,56,0.2)" }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Zapytaj o swój zestaw..."
                  className="flex-1 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "2px solid rgba(184,92,56,0.55)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#B85C38")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(184,92,56,0.55)")}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl transition-all disabled:opacity-40"
                  style={{ background: "rgba(184,92,56,0.8)", color: "white", boxShadow: "none", border: "none", padding: 0 }}
                >
                  <SendIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
