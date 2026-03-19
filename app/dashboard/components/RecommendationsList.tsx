"use client";

import { useState } from "react";
import { useFavorites } from "@/app/dashboard/hooks/useFavorites";
import { useConfigurator } from "@/app/hooks/useConfigurator";
import { PriceHistoryModal } from "./PriceHistoryModal";
import { ChatModal } from "./ChatModal";

/* ── Icons ── */
function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}
function WrenchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}
function ChatIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}


/* ── Action button ── */
function ActionBtn({
  icon, label, onClick, active, highlight, large,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  highlight?: boolean;
  large?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center font-medium rounded-lg transition-all duration-200 ${large ? "gap-2 text-sm" : "gap-1.5 text-xs"}`}
      style={{
        background: active
          ? "rgba(184,92,56,0.12)"
          : highlight
          ? large ? "rgba(184,92,56,0.15)" : "rgba(184,92,56,0.08)"
          : "transparent",
        color: active || highlight ? "#B85C38" : "rgba(255,255,255,0.5)",
        border: active
          ? "1px solid rgba(184,92,56,0.4)"
          : highlight
          ? large ? "1px solid rgba(184,92,56,0.45)" : "1px solid rgba(184,92,56,0.25)"
          : "1px solid rgba(255,255,255,0.1)",
        boxShadow: large && highlight ? "0 0 18px rgba(184,92,56,0.15)" : "none",
        padding: large ? "10px 18px" : "8px 12px",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/* ── Main ── */
export function RecommendationsList({ items }: { items: any[] }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInConfigurator, addToConfigurator } = useConfigurator();
  const [priceHistoryItem, setPriceHistoryItem] = useState<any | null>(null);
  const [chatItem, setChatItem] = useState<any | null>(null);
  const [configToast, setConfigToast] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(key: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleAddToConfigurator(item: any) {
    addToConfigurator(item);
    setConfigToast(item.name);
    setTimeout(() => setConfigToast(null), 3000);
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-white/40 text-center py-10" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        Brak dopasowań na podstawie Twoich preferencji.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5 w-full">
        {items.map((item: any, index: number) => {
          const {
            id, name, ai_reason, description, matchPercent,
            price, latest_scraped_price, image_url, product_url,
          } = item;

          const displayPrice: number | null = latest_scraped_price?.price ?? price ?? null;
          const fav = isFavorite(id ?? name);
          const inConf = isInConfigurator(id ?? name);

          const descText = ai_reason ?? description ?? "";
          const expandKey = String(id ?? index);
          const isExpanded = expandedIds.has(expandKey);

          return (
            <div
              key={index}
              className="w-full rounded-2xl overflow-hidden bg-black/50 backdrop-blur-sm transition-all duration-300"
              style={{
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                border: "2px solid rgba(184,92,56,0.55)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(184,92,56,0.8)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 50px rgba(184,92,56,0.15)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(184,92,56,0.55)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <div className="flex flex-col sm:flex-row">

                {/* LEFT — image */}
                <div
                  className="flex-shrink-0 sm:w-56 sm:h-auto h-52 bg-black/60 flex items-center justify-center overflow-hidden border-b sm:border-b-0 sm:border-r"
                  style={{ borderColor: "rgba(184,92,56,0.1)" }}
                >
                  {image_url ? (
                    <img src={image_url} alt={name}
                      className="w-full h-full object-contain p-3"
                      style={{ background: "rgba(255,255,255,0.02)" }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-white/15 p-6 text-center">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span className="text-xs">brak zdjęcia</span>
                    </div>
                  )}
                </div>

                {/* RIGHT — content */}
                <div className="flex-1 flex flex-col justify-between p-6 gap-4 min-w-0">

                  {/* Name + match */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                    <div className="flex-1 min-w-0">
                      <h2
                        className="text-[#B85C38] font-semibold leading-tight mb-1 truncate"
                        style={{
                          fontFamily: "var(--font-instrument), Georgia, serif",
                          fontSize: "clamp(1.05rem, 2vw, 1.35rem)",
                        }}
                      >
                        {name}
                      </h2>
                      {product_url && (
                        <a href={product_url} target="_blank" rel="noopener noreferrer"
                          className="text-white/30 hover:text-[#B85C38] text-xs transition-colors">
                          ↗ zobacz w sklepie
                        </a>
                      )}
                    </div>

                    {matchPercent && (
                      <div
                        className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl px-4 py-2 text-center min-w-[80px]"
                        style={{
                          background: "rgba(184,92,56,0.08)",
                          border: "1px solid rgba(184,92,56,0.2)",
                        }}
                      >
                        <span className="text-[#B85C38] font-bold leading-none" style={{ fontSize: "2rem" }}>
                          {matchPercent}%
                        </span>
                        <span className="text-white/35 text-xs mt-0.5 uppercase tracking-wider">match</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <p className={`text-white/60 leading-relaxed text-sm ${isExpanded ? "" : "line-clamp-3"}`}>
                      {descText}
                    </p>
                    {descText.length > 160 && (
                      <button
                        onClick={() => toggleExpand(expandKey)}
                        className="mt-1.5 text-xs text-[#B85C38]/60 hover:text-[#B85C38] transition-colors flex items-center gap-1"
                        style={{ background: "transparent" }}
                      >
                        {isExpanded ? (
                          <>Pokaż mniej <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg></>
                        ) : (
                          <>Pokaż więcej <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg></>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Price + actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-white/8">
                    <div>
                      {displayPrice ? (
                        <p className="text-white font-bold text-2xl">
                          {displayPrice} <span className="text-[#B85C38] text-lg">zł</span>
                        </p>
                      ) : product_url ? (
                        <a href={product_url} target="_blank" rel="noopener noreferrer"
                          className="text-[#B85C38] text-sm underline hover:text-white transition-colors">
                          Sprawdź cenę w sklepie
                        </a>
                      ) : (
                        <span className="text-white/25 text-sm">Cena niedostępna</span>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <ActionBtn
                        icon={<HeartIcon filled={fav} />}
                        label={fav ? "W ulubionych" : "Ulubione"}
                        active={fav}
                        onClick={() => toggleFavorite({
                          id: id ?? name, name, description, ai_reason, matchPercent,
                          price, latest_scraped_price, image_url, product_url,
                        })}
                      />
                      <ActionBtn
                        icon={<WrenchIcon />}
                        label={inConf ? "W konfiguratorze" : "Dodaj do konfiguratora"}
                        active={inConf}
                        onClick={() => handleAddToConfigurator({
                          id: id ?? name, name, description, ai_reason, matchPercent,
                          price, latest_scraped_price, image_url, product_url,
                        })}
                      />
                      <ActionBtn icon={<ChatIcon size={19} />} label="Zapytaj asystenta" highlight large onClick={() => setChatItem(item)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {configToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1a1a1a] text-white text-sm px-5 py-3 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.6)]"
          style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", border: "1px solid rgba(184,92,56,0.35)" }}
        >
          <WrenchIcon />
          <span className="max-w-xs truncate">Dodano do konfiguratora: <span className="text-[#B85C38]">{configToast}</span></span>
        </div>
      )}

      {priceHistoryItem && (
        <PriceHistoryModal
          gearId={priceHistoryItem.id}
          productName={priceHistoryItem.name}
          currentPrice={priceHistoryItem.latest_scraped_price?.price ?? priceHistoryItem.price}
          onClose={() => setPriceHistoryItem(null)}
        />
      )}

      {chatItem && (
        <ChatModal
          product={{
            name: chatItem.name,
            description: chatItem.ai_reason ?? chatItem.description,
            price: chatItem.latest_scraped_price?.price ?? chatItem.price,
          }}
          onClose={() => setChatItem(null)}
        />
      )}
    </>
  );
}
