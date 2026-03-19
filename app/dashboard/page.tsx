"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useRecommendations } from "./hooks/useRecommendations";
import { RecommendationsList } from "./components/RecommendationsList";
import { AppSidebar } from "@/components/AppSidebar";

function DashboardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("query") ?? "";
  const initialInspiration = searchParams.get("inspiration") ?? "";
  const rawMin = searchParams.get("minPrice");
  const rawMax = searchParams.get("maxPrice");
  const activeMinPrice = rawMin ? Number(rawMin) : undefined;
  const activeMaxPrice = rawMax ? Number(rawMax) : undefined;

  const [inputQuery, setInputQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [activeInspiration] = useState(initialInspiration);

  const { data, loading, error } = useRecommendations(activeQuery, {
    minPrice: activeMinPrice,
    maxPrice: activeMaxPrice,
    inspiration: activeInspiration,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!inputQuery.trim() && !activeInspiration) return;
    setActiveQuery(inputQuery.trim());
    const params = new URLSearchParams();
    if (inputQuery.trim()) params.set("query", inputQuery.trim());
    if (activeInspiration) params.set("inspiration", activeInspiration);
    if (activeMinPrice) params.set("minPrice", String(activeMinPrice));
    if (activeMaxPrice) params.set("maxPrice", String(activeMaxPrice));
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative">
      {/* Sidebar */}
      <AppSidebar />

      {/* Fixed background image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url('/dashboard-bg.png')", zIndex: 0 }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "rgba(0,0,0,0.45)", zIndex: 0 }}
      />

      {/* Top nav bar — offset by sidebar on desktop */}
      <header
        className="fixed top-0 left-0 md:left-60 right-0 z-30 backdrop-blur-xl border-b"
        style={{ background: "rgba(0,0,0,0.8)", borderColor: "rgba(184,92,56,0.15)" }}
      >
        <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          {/* Space for hamburger on mobile */}
          <div className="w-10 md:hidden flex-shrink-0" />

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl flex gap-2">
            <input
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Zmień zapytanie — opisz czego szukasz..."
              className="flex-1 h-9 text-sm px-3 py-0 rounded-lg"
              style={{ fontSize: "0.85rem" }}
            />
            <button
              type="submit"
              className="h-9 px-4 text-sm font-semibold rounded-lg py-0 text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
            >
              Szukaj
            </button>
          </form>

          {/* Breadcrumb */}
          <nav className="hidden lg:flex items-center gap-2 text-xs text-white/35 flex-shrink-0">
            <a href="/onboarding" className="hover:text-[#B85C38] transition-colors">Preferencje</a>
            <span>/</span>
            <span className="text-[#B85C38]">Rekomendacje</span>
          </nav>
        </div>
      </header>

      {/* Main content — offset by sidebar width on desktop */}
      <main className="relative z-10 pt-20 pb-16 px-4 md:ml-60">
        <div className="max-w-5xl mx-auto">

          {/* Active query display */}
          {(activeQuery || activeInspiration) && (
            <div className="mb-10 text-center">
              <p className="text-white/35 text-xs uppercase tracking-widest mb-2">Szukasz</p>
              {activeQuery && (
                <p
                  className="text-white/80 italic"
                  style={{
                    fontFamily: "var(--font-instrument), Georgia, serif",
                    fontSize: "clamp(1rem, 2vw, 1.3rem)",
                  }}
                >
                  &ldquo;{activeQuery}&rdquo;
                </p>
              )}
              {activeInspiration && (
                <p className="text-white/45 text-sm mt-1" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                  Inspiracja: <span className="text-[#D07A50]">{activeInspiration}</span>
                </p>
              )}
              {(activeMinPrice || activeMaxPrice) && (
                <p className="text-white/35 text-xs mt-2 tracking-wide">
                  Budżet:&nbsp;
                  {activeMinPrice ? `od ${activeMinPrice.toLocaleString("pl-PL")} zł` : ""}
                  {activeMinPrice && activeMaxPrice ? " · " : ""}
                  {activeMaxPrice ? `do ${activeMaxPrice.toLocaleString("pl-PL")} zł` : ""}
                </p>
              )}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "rgba(184,92,56,0.2)" }} />
                <div className="absolute inset-0 rounded-full border-t-2 border-[#B85C38] animate-spin" />
              </div>
              <div className="text-center">
                <p
                  className="text-white text-xl mb-2"
                  style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
                >
                  Analizuję Twoje zapytanie...
                </p>
                <p className="text-white/40 text-sm">AI dobiera najlepszy sprzęt dla Ciebie</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="max-w-md mx-auto mt-10 bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
              <p className="text-red-400 mb-2 font-semibold">Coś poszło nie tak</p>
              <p className="text-white/50 text-sm">{error}</p>
            </div>
          )}

          {/* Results header */}
          {!loading && !error && data && data.length > 0 && (
            <div className="mb-8">
              <h1
                className="text-white text-2xl font-bold"
                style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
              >
                Twoje rekomendacje posortowane od najlepiej dopasowanych produktów
              </h1>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && data && data.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-[#B85C38] mb-2"
                style={{ background: "rgba(184,92,56,0.1)", border: "1px solid rgba(184,92,56,0.25)" }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <p
                className="text-white text-xl font-semibold"
                style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
              >
                Brak dopasowań
              </p>
              <p className="text-white/40 text-sm max-w-sm">
                Spróbuj zmienić opis lub użyj innych słów kluczowych.
              </p>
            </div>
          )}

          {/* No query state */}
          {!loading && !activeQuery && !activeInspiration && (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
              <p
                className="text-white/60 text-xl"
                style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
              >
                Wpisz zapytanie, aby zobaczyć rekomendacje
              </p>
            </div>
          )}

          {/* Recommendations */}
          {!loading && !error && data && data.length > 0 && (
            <RecommendationsList items={data} />
          )}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-t-2 border-[#B85C38] animate-spin" />
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}
