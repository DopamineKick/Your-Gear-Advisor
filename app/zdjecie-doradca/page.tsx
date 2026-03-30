"use client";

import { useState, useRef, useCallback } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { useSupabase } from "@/components/SupabaseProvider";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB
const MAX_DIMENSION = 1024;

/**
 * Compress image client-side using canvas.
 * Returns { base64, mimeType } — resized to max 1024px, JPEG quality 0.8.
 */
function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mimeType: "image/jpeg" });
      };
      img.onerror = () => reject(new Error("Nie udało się wczytać obrazu."));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Nie udało się odczytać pliku."));
    reader.readAsDataURL(file);
  });
}

export default function ZdjecieDoradcaPage() {
  const { supabase } = useSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Niedozwolony format. Dozwolone: JPEG, PNG, WebP.");
      return;
    }
    // Validate size (before compression)
    if (file.size > 10 * 1024 * 1024) {
      setError("Plik jest zbyt duży (max 10 MB przed kompresją).");
      return;
    }

    try {
      const { base64, mimeType } = await compressImage(file);
      setImageBase64(base64);
      setImageMime(mimeType);
      setImagePreview(`data:${mimeType};base64,${base64}`);
      // Reset conversation for new image
      setMessages([]);
    } catch (err: any) {
      setError(err.message || "Błąd wczytywania zdjęcia.");
    }
  }

  async function handleSend() {
    if (!imageBase64 || !question.trim()) return;

    const userMessage = question.trim();
    setQuestion("");
    setError(null);

    const updatedMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(updatedMessages);
    setLoading(true);
    scrollToBottom();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Musisz być zalogowany.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/photo-advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          image: imageBase64,
          mimeType: imageMime,
          question: userMessage,
          // Send previous messages (text-only) for context
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Błąd serwera.");
        setLoading(false);
        return;
      }

      setMessages([...updatedMessages, { role: "assistant", content: data.reply }]);
      scrollToBottom();
    } catch {
      setError("Błąd połączenia z serwerem.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleNewPhoto() {
    setImagePreview(null);
    setImageBase64(null);
    setMessages([]);
    setError(null);
    setQuestion("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative">
      <AppSidebar />

      <main className="relative z-10 pt-6 pb-16 px-4 md:ml-60">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <h1
            className="text-2xl md:text-3xl font-bold text-white mb-2"
            style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
          >
            Zrób zdjęcie swojego zestawu gitarowego
            <br />
            <span className="text-[#B85C38]">i zapytaj doradcę</span>
          </h1>
          <p className="text-white/40 text-sm mb-6">
            Prześlij zdjęcie sprzętu gitarowego, a AI doradca przeanalizuje go i odpowie na Twoje pytania.
          </p>

          {/* Upload area */}
          {!imagePreview ? (
            <label
              className="flex flex-col items-center justify-center gap-3 p-10 rounded-2xl cursor-pointer transition-all duration-200 hover:border-[#B85C38]/60"
              style={{
                border: "2px dashed rgba(184,92,56,0.35)",
                background: "rgba(184,92,56,0.03)",
              }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span className="text-white/50 text-sm text-center">
                Kliknij, aby wybrać zdjęcie<br />
                <span className="text-white/30 text-xs">lub zrób zdjęcie aparatem (mobile)</span>
              </span>
              <span className="text-white/20 text-xs">JPEG, PNG, WebP — max 4 MB po kompresji</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-4">
              {/* Image preview + change button */}
              <div className="relative rounded-2xl overflow-hidden" style={{ border: "2px solid rgba(184,92,56,0.3)" }}>
                <img
                  src={imagePreview}
                  alt="Podgląd zdjęcia"
                  className="w-full max-h-[400px] object-contain bg-black/50"
                />
                <button
                  onClick={handleNewPhoto}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white transition-colors"
                  style={{
                    background: "rgba(0,0,0,0.7)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  Zmień zdjęcie
                </button>
              </div>

              {/* Chat messages */}
              {messages.length > 0 && (
                <div
                  className="rounded-2xl p-4 space-y-3 max-h-[400px] overflow-y-auto"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(184,92,56,0.15)",
                  }}
                >
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className="max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed"
                        style={
                          msg.role === "user"
                            ? {
                                background: "rgba(184,92,56,0.15)",
                                border: "1px solid rgba(184,92,56,0.25)",
                                color: "rgba(255,255,255,0.9)",
                              }
                            : {
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "rgba(255,255,255,0.85)",
                              }
                        }
                      >
                        {msg.role === "assistant" && (
                          <span className="text-[#B85C38] text-xs font-medium block mb-1">Doradca AI</span>
                        )}
                        <div style={{ whiteSpace: "pre-wrap" }}>
                          {msg.content.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div
                        className="rounded-xl px-4 py-2.5 text-sm"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        <span className="text-[#B85C38] text-xs font-medium block mb-1">Doradca AI</span>
                        Analizuję zdjęcie...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Input area */}
              <div
                className="flex gap-2 items-end rounded-xl p-2"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "2px solid rgba(184,92,56,0.3)",
                }}
              >
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    messages.length === 0
                      ? "Np. Czy ten zestaw nadaje się do blues-rocka?"
                      : "Zadaj kolejne pytanie..."
                  }
                  rows={2}
                  className="flex-1 bg-transparent text-white/90 text-sm placeholder-white/25 resize-none outline-none p-2"
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !question.trim()}
                  className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    background: loading || !question.trim() ? "rgba(184,92,56,0.2)" : "#B85C38",
                    color: loading || !question.trim() ? "rgba(255,255,255,0.3)" : "white",
                    cursor: loading || !question.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "..." : "Wyślij"}
                </button>
              </div>
              <p className="text-white/20 text-xs text-right">
                {question.length}/500 znaków · Enter = wyślij, Shift+Enter = nowa linia
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="mt-4 p-3 rounded-xl text-sm"
              style={{
                background: "rgba(220,38,38,0.08)",
                border: "1px solid rgba(220,38,38,0.25)",
                color: "rgba(248,113,113,0.9)",
              }}
            >
              {error}
            </div>
          )}

          {/* Info box */}
          <div
            className="mt-6 p-4 rounded-xl text-xs text-white/30 space-y-1"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <p><strong className="text-white/40">Jak to działa?</strong></p>
            <p>Możesz prowadzić rozmowę i zadawać Inteligentnemu Doradcy pytania uzupełniające na podstawie zdjęcia zestawu gitarowego. Zdjęcie jest analizowane przez model AI który identyfikuje sprzęt gitarowy i odpowiada na Twoje pytania.</p>
            <p>Aplikacja Your Gear Advisor nie przechowuje Twoich zdjęć, administrator nie ma do nich wglądu, a historia dodawanych zdjęć jest czyszczona wraz z zamknięciem okna z tą zakładką.</p>
            <p className="text-white/20">Limit: 10 zapytań dziennie. Obsługiwane formaty: JPEG, PNG, WebP.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
