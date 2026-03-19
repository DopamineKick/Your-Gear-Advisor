"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { useSupabase } from "@/components/SupabaseProvider";

const EXAMPLES = [
  "Gitara elektryczna do bluesa, vintage brzmienie, budżet do 1500 zł",
  "Wzmacniacz lampowy do grania w domu, czysty dźwięk, do 2000 zł",
  "Gitara akustyczna dla początkującego, dobra do fingerpickingu",
  "Heavy metal gitara z aktywnym pikupem, Floyd Rose, do 3000 zł",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [query, setQuery] = useState("");

  // Guard: require confirmed email and active session
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      if (!user.email_confirmed_at) {
        supabase.auth.signOut();
        router.replace("/auth/register");
      }
    });
  }, []);
  const [focused, setFocused] = useState(false);
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [inspiration, setInspiration] = useState("");

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim() && !inspiration.trim()) return;

    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (inspiration.trim()) params.set("inspiration", inspiration.trim());
    if (priceFrom) params.set("minPrice", priceFrom);
    if (priceTo) params.set("maxPrice", priceTo);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Sidebar */}
      <AppSidebar />

      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/onboarding-bg.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/55" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />

      {/* Top bar */}
      <div className="relative z-10 px-8 pt-5 flex items-center justify-between md:ml-60">
        <a
          href="/onboarding"
          className="inline-block"
          style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
        >
          <span className="text-white font-bold text-xl tracking-wide">Your </span>
          <span className="text-[#B85C38] font-bold text-xl tracking-wide">Gear</span>
          <span className="text-white font-bold text-xl tracking-wide"> Advisor</span>
        </a>

        <nav className="flex items-center gap-2 text-xs text-white/35" aria-label="breadcrumb">
          <a href="/onboarding" className="hover:text-white transition-colors">Szukaj</a>
          <span>/</span>
          <a href="/dashboard" className="hover:text-white transition-colors">Rekomendacje</a>
        </nav>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col justify-end pb-16 px-6 md:ml-60">
        <div className="max-w-3xl mx-auto w-full">

          {/* Heading */}
          <div className="mb-8 text-center">
            <p className="text-[#B85C38] text-xs font-semibold uppercase tracking-widest mb-4">
              Krok 1 z 1
            </p>
            <h1
              style={{
                fontFamily: "var(--font-instrument), Georgia, serif",
                fontSize: "clamp(2.4rem, 6vw, 4rem)",
                fontWeight: 400,
                lineHeight: 1.15,
                color: "white",
                textShadow: "0 4px 30px rgba(0,0,0,0.9)",
              }}
            >
              Czego szukasz?
            </h1>
            <p
              style={{
                fontFamily: "var(--font-instrument), Georgia, serif",
                fontSize: "clamp(1rem, 2vw, 1.2rem)",
                fontStyle: "italic",
                color: "rgba(255,255,255,0.55)",
                marginTop: "0.75rem",
                textShadow: "0 2px 15px rgba(0,0,0,0.8)",
              }}
            >
              Opisz własnymi słowami — AI dobierze idealny sprzęt
            </p>
          </div>

          {/* Search box */}
          <form onSubmit={handleSubmit} className="relative mb-5">
            <div
              className="relative rounded-2xl transition-all duration-300"
              style={{
                boxShadow: focused
                  ? "0 0 0 2px #B85C38, 0 0 50px rgba(184,92,56,0.25)"
                  : "0 0 0 2px rgba(184,92,56,0.55), 0 8px 40px rgba(0,0,0,0.6)",
              }}
            >
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="np. Szukam gitary elektrycznej do bluesa, vintage brzmienie, budżet do 1500 zł..."
                className="w-full outline-none border-0 shadow-none rounded-t-2xl text-white resize-none"
                style={{
                  background: "rgba(12,12,12,0.82)",
                  backdropFilter: "blur(32px)",
                  WebkitBackdropFilter: "blur(32px)",
                  padding: "22px 24px 18px 24px",
                  fontSize: "1.05rem",
                  lineHeight: 1.6,
                  minHeight: "130px",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                }}
                rows={4}
              />
              <div
                className="flex items-center justify-between px-4 py-3 rounded-b-2xl border-t"
                style={{
                  background: "rgba(0,0,0,0.75)",
                  backdropFilter: "blur(24px)",
                  borderColor: "rgba(184,92,56,0.15)",
                }}
              >
                <span className="text-white/30 text-xs">
                  Enter — szukaj &nbsp;·&nbsp; Shift+Enter — nowa linia
                </span>
                <button
                  type="submit"
                  disabled={!query.trim() && !inspiration.trim()}
                  className="flex items-center gap-2 font-semibold text-sm rounded-xl px-4 py-2 transition-all duration-200 disabled:opacity-30 hover:scale-[1.03] text-white"
                  style={{
                    background: (query.trim() || inspiration.trim())
                      ? "linear-gradient(135deg, #B85C38, #D07A50)"
                      : "rgba(255,255,255,0.08)",
                    color: (query.trim() || inspiration.trim()) ? "white" : "rgba(255,255,255,0.4)",
                    boxShadow: "none",
                    padding: "8px 16px",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Szukaj
                </button>
              </div>
            </div>
          </form>

          {/* Optional fields */}
          <div
            className="mb-6 rounded-2xl p-5"
            style={{
              background: "rgba(12,12,12,0.75)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "2px solid rgba(184,92,56,0.55)",
            }}
          >
            <p className="text-white text-xs uppercase tracking-widest mb-5">
              Doprecyzuj (opcjonalne)
            </p>

            {/* Price range */}
            <div className="mb-4">
              <p className="text-white text-xs mb-2">Zakres ceny</p>
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="Od"
                    value={priceFrom}
                    onChange={(e) => setPriceFrom(e.target.value)}
                    className="w-full text-white text-sm rounded-xl px-3 pr-9 py-2.5 outline-none border transition-colors duration-200"
                    style={{
                      background: "rgba(0,0,0,0.5)",
                      borderColor: "rgba(255,255,255,0.1)",
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(184,92,56,0.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs pointer-events-none">zł</span>
                </div>
                <span className="text-white/25 text-sm select-none">—</span>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="Do"
                    value={priceTo}
                    onChange={(e) => setPriceTo(e.target.value)}
                    className="w-full text-white text-sm rounded-xl px-3 pr-9 py-2.5 outline-none border transition-colors duration-200"
                    style={{
                      background: "rgba(0,0,0,0.5)",
                      borderColor: "rgba(255,255,255,0.1)",
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(184,92,56,0.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs pointer-events-none">zł</span>
                </div>
              </div>
            </div>

            {/* Style / artist */}
            <div>
              <p className="text-white text-xs mb-2">Styl muzyczny lub artysta, którym się inspiruję</p>
              <input
                type="text"
                placeholder="np. John Frusciante, Metallica, blues, jazz, indie rock..."
                value={inspiration}
                onChange={(e) => setInspiration(e.target.value)}
                className="w-full text-white text-sm rounded-xl px-3 py-2.5 outline-none border transition-colors duration-200"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  borderColor: "rgba(255,255,255,0.1)",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(184,92,56,0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>
          </div>

          {/* Example queries */}
          <div className="mb-8">
            <p className="text-white text-xs uppercase tracking-widest mb-3 text-center">
              Przykłady zapytań — kliknij aby użyć
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setQuery(ex)}
                  className="text-left text-sm text-white/50 hover:text-[#B85C38] border rounded-xl px-4 py-3 transition-all duration-200 backdrop-blur-sm"
                  style={{
                    background: "rgba(12,12,12,0.65)",
                    borderColor: "rgba(255,255,255,0.15)",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    boxShadow: "none",
                    padding: "12px 16px",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(184,92,56,0.4)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(184,92,56,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(12,12,12,0.65)";
                  }}
                >
                  <span className="text-[#B85C38]/50 mr-2">→</span>
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex justify-center">
            <button
              onClick={() => handleSubmit()}
              disabled={!query.trim() && !inspiration.trim()}
              className="px-12 py-4 rounded-xl font-bold text-white text-base tracking-wide transition-all duration-300 disabled:opacity-30 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(184,92,56,0.4)]"
              style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
            >
              Znajdź mój sprzęt →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
