"use client";

import { useState } from "react";
import { useFavorites } from "@/app/dashboard/hooks/useFavorites";
import { useConfigurator } from "@/app/hooks/useConfigurator";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  );
}

export default function FavoritesPage() {
  const { favorites, removeFavorite } = useFavorites();
  const { isInConfigurator, addToConfigurator } = useConfigurator();
  const [configToast, setConfigToast] = useState<string | null>(null);

  function handleAddToConfigurator(item: any) {
    addToConfigurator(item);
    setConfigToast(item.name);
    setTimeout(() => setConfigToast(null), 3000);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      {/* Sidebar */}
      <AppSidebar />

      {/* Fixed background image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url('/favorites-bg.png')", zIndex: 0 }}
      />
      <div className="fixed inset-0 bg-gradient-to-t from-black via-black/75 to-black/55 pointer-events-none" style={{ zIndex: 0 }} />
      <div className="fixed inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30 pointer-events-none" style={{ zIndex: 0 }} />

      {/* Main content */}
      <main className="relative z-10 pt-6 pb-16 px-4 md:ml-60">
          {/* Header - left-aligned */}
          <div className="max-w-5xl mb-10">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[#B85C38]"><HeartIcon filled /></span>
              <h1
                className="text-white text-2xl font-bold"
                style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
              >
                Ulubione produkty
              </h1>
            </div>
            <p className="text-white/40 text-sm">
              {favorites.length > 0
                ? `${favorites.length} ${favorites.length === 1 ? "produkt" : favorites.length < 5 ? "produkty" : "produktów"} zapisanych`
                : ""}
            </p>
          </div>

          {/* Empty state - centered */}
          {favorites.length === 0 && (
            <div className="w-full flex flex-col items-center justify-center py-32 gap-5 text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-[#B85C38]/40"
                style={{ background: "rgba(184,92,56,0.08)", border: "1px solid rgba(184,92,56,0.2)" }}
              >
                <HeartIcon />
              </div>
              <p
                className="text-white/70 text-xl"
                style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
              >
                Pusto!
              </p>
              <p className="text-white/45 text-sm max-w-xs leading-relaxed">
                Dodaj z wyników wyszukiwania wybrane produkty do ulubionych, aby widzieć tu swój wybrany sprzęt.
              </p>
              <Link
                href="/onboarding"
                className="mt-2 px-8 py-3 rounded-xl font-bold text-white text-sm"
                style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
              >
                Znajdź produkty
              </Link>
            </div>
          )}

          {/* Favorites grid */}
          {favorites.length > 0 && (
            <div className="max-w-5xl flex flex-col gap-5">
              {favorites.map((item) => {
                const displayPrice = item.latest_scraped_price?.price ?? item.price ?? null;

                return (
                  <div
                    key={item.id}
                    className="w-full rounded-2xl overflow-hidden border bg-black/50 backdrop-blur-sm transition-all duration-300"
                    style={{
                      borderColor: "rgba(184,92,56,0.2)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(184,92,56,0.4)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(184,92,56,0.10)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(184,92,56,0.2)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Image */}
                      <div
                        className="flex-shrink-0 sm:w-56 sm:h-auto h-48 bg-black/60 flex items-center justify-center overflow-hidden border-b sm:border-b-0 sm:border-r"
                        style={{ borderColor: "rgba(184,92,56,0.1)" }}
                      >
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-contain p-3"
                          />
                        ) : (
                          <div className="text-white/15 text-xs text-center px-4">brak zdjęcia</div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 flex flex-col justify-between p-6 gap-4 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h2
                              className="text-[#B85C38] font-semibold text-lg leading-tight mb-1 truncate"
                              style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
                            >
                              {item.name}
                            </h2>
                            {item.product_url && (
                              <a href={item.product_url} target="_blank" rel="noopener noreferrer"
                                className="text-white/30 hover:text-[#B85C38] text-xs transition-colors">
                                ↗ zobacz w sklepie
                              </a>
                            )}
                          </div>
                          {item.matchPercent && (
                            <div
                              className="flex-shrink-0 flex flex-col items-center rounded-xl px-3 py-2 text-center"
                              style={{
                                background: "rgba(184,92,56,0.08)",
                                border: "1px solid rgba(184,92,56,0.2)",
                              }}
                            >
                              <span className="text-[#B85C38] font-bold text-2xl leading-none">{item.matchPercent}%</span>
                              <span className="text-white/35 text-xs mt-0.5 uppercase tracking-wider">match</span>
                            </div>
                          )}
                        </div>

                        <p className="text-white/55 text-sm leading-relaxed line-clamp-2">
                          {item.ai_reason ?? item.description}
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-white/8">
                          {displayPrice ? (
                            <p className="text-white font-bold text-xl">
                              {displayPrice} <span className="text-[#B85C38]">€</span>
                            </p>
                          ) : (
                            <span className="text-white/25 text-sm">Cena niedostępna</span>
                          )}

                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => handleAddToConfigurator(item)}
                              className="flex items-center gap-2 text-xs font-medium rounded-lg transition-all duration-200"
                              style={{
                                background: isInConfigurator(item.id) ? "rgba(184,92,56,0.12)" : "transparent",
                                color: isInConfigurator(item.id) ? "#B85C38" : "rgba(255,255,255,0.5)",
                                border: isInConfigurator(item.id) ? "1px solid rgba(184,92,56,0.4)" : "1px solid rgba(255,255,255,0.1)",
                                boxShadow: "none",
                                padding: "8px 16px",
                              }}
                            >
                              <WrenchIcon />
                              {isInConfigurator(item.id) ? "W konfiguratorze" : "Dodaj do konfiguratora zestawu"}
                            </button>
                            <button
                              onClick={() => removeFavorite(item.id)}
                              className="flex items-center gap-2 text-xs font-medium text-red-400/70 hover:text-red-400 border border-red-400/15 hover:border-red-400/35 rounded-lg transition-all duration-200"
                              style={{ background: "transparent", boxShadow: "none", padding: "8px 16px" }}
                            >
                              <HeartIcon filled />
                              Usuń z ulubionych
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </main>

      {configToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1a1a1a] text-white text-sm px-5 py-3 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.6)]"
          style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", border: "1px solid rgba(184,92,56,0.35)" }}
        >
          <WrenchIcon />
          <span className="max-w-xs truncate">Dodano do konfiguratora: <span className="text-[#B85C38]">{configToast}</span></span>
        </div>
      )}
    </div>
  );
}
