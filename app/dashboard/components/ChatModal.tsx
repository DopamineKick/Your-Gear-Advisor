"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ProductContext {
  name: string;
  description?: string;
  price?: number | null;
}

interface Props {
  product: ProductContext;
  onClose: () => void;
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

export function ChatModal({ product, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Cześć! Jestem asystentem Your Gear Advisor. Możesz mnie zapytać o wszystko dotyczące produktu **${product.name}** — specyfikację techniczną, porównania z innymi modelami, dla jakiego stylu gry jest odpowiedni czy co do niego warto dokupić. Pytaj śmiało! 🎸`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          productContext: {
            name: product.name,
            description: product.description,
            price: product.price,
          },
        }),
      });
      const json = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: json.reply ?? "Brak odpowiedzi." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Przepraszam, wystąpił błąd połączenia. Spróbuj ponownie." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Simple markdown bold rendering
  function renderContent(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-xl bg-[#0d0d0d] border border-[#B85C38]/25 rounded-2xl shadow-[0_0_80px_rgba(184,92,56,0.12)] flex flex-col overflow-hidden"
        style={{ height: "min(640px, 90vh)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#B85C38]/15 border border-[#B85C38]/30 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm">Asystent gitarowy</p>
              <p className="text-white/35 text-xs truncate">{product.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Zamknij"
            className="flex-shrink-0 ml-3 w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white transition-all duration-200 hover:scale-110"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}
          >
            <span className="text-sm font-bold leading-none">✕</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#B85C38]/15 border border-[#B85C38]/25 text-white rounded-br-sm"
                    : "bg-white/5 border border-white/8 text-white/80 rounded-bl-sm"
                }`}
              >
                {renderContent(msg.content)}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-[#B85C38]/60 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-white/8">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Zapytaj o ten produkt..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none text-sm rounded-xl px-4 py-3 max-h-32 disabled:opacity-50"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                outline: "none",
                lineHeight: 1.5,
                fontFamily: "var(--font-inter), system-ui, sans-serif",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30"
              style={{
                background: input.trim() && !loading
                  ? "linear-gradient(135deg, #B85C38, #D07A50)"
                  : "rgba(255,255,255,0.08)",
                color: input.trim() && !loading ? "black" : "white",
              }}
            >
              <SendIcon />
            </button>
          </div>
          <p className="text-white/20 text-xs mt-1.5 text-center">
            Enter — wyślij · Shift+Enter — nowa linia
          </p>
        </div>
      </div>
    </div>
  );
}
