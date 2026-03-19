"use client";

import { useEffect, useState } from "react";

interface PricePoint {
  recorded_at: string;
  price: number;
}

type Range = "3m" | "1y" | "3y";

const RANGE_LABELS: Record<Range, string> = {
  "3m": "3 miesiące",
  "1y": "1 rok",
  "3y": "3 lata",
};

function filterByRange(data: PricePoint[], range: Range): PricePoint[] {
  const now = Date.now();
  const ms: Record<Range, number> = {
    "3m": 90 * 24 * 60 * 60 * 1000,
    "1y": 365 * 24 * 60 * 60 * 1000,
    "3y": 3 * 365 * 24 * 60 * 60 * 1000,
  };
  const cutoff = now - ms[range];
  return data.filter((p) => new Date(p.recorded_at).getTime() >= cutoff);
}

function generateEmptyPoints(range: Range): PricePoint[] {
  const now = Date.now();
  const count: Record<Range, number> = { "3m": 12, "1y": 12, "3y": 12 };
  const stepMs: Record<Range, number> = {
    "3m": 7 * 24 * 60 * 60 * 1000,
    "1y": 30 * 24 * 60 * 60 * 1000,
    "3y": 90 * 24 * 60 * 60 * 1000,
  };
  return Array.from({ length: count[range] }, (_, i) => ({
    recorded_at: new Date(now - stepMs[range] * (count[range] - 1 - i)).toISOString(),
    price: 0,
  }));
}

function formatDateLabel(iso: string, range: Range): string {
  const d = new Date(iso);
  if (range === "3m") {
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  }
  if (range === "1y") {
    return d.toLocaleDateString("pl-PL", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("pl-PL", { month: "short", year: "numeric" });
}

interface Props {
  gearId: string;
  productName: string;
  currentPrice?: number | null;
  onClose: () => void;
}

export function PriceHistoryModal({ gearId, productName, currentPrice, onClose }: Props) {
  const [range, setRange] = useState<Range>("1y");
  const [allData, setAllData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/price-history/${gearId}`)
      .then((r) => r.json())
      .then((json) => {
        setAllData(json.history ?? []);
      })
      .catch(() => setAllData([]))
      .finally(() => setLoading(false));
  }, [gearId]);

  const filtered = filterByRange(allData, range);
  const hasData = filtered.length > 0 && filtered.some((p) => p.price > 0);
  const displayPoints = hasData ? filtered : generateEmptyPoints(range);

  // SVG chart dimensions
  const W = 560;
  const H = 200;
  const PAD = { top: 20, right: 16, bottom: 36, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const prices = displayPoints.map((p) => p.price).filter((p) => p > 0);
  const minP = prices.length > 0 ? Math.min(...prices) * 0.92 : 0;
  const maxP = prices.length > 0 ? Math.max(...prices) * 1.08 : 100;

  const toX = (i: number) => PAD.left + (i / Math.max(displayPoints.length - 1, 1)) * chartW;
  const toY = (price: number) => {
    if (!hasData) return PAD.top + chartH / 2;
    return PAD.top + chartH - ((price - minP) / (maxP - minP)) * chartH;
  };

  const pathD = hasData
    ? displayPoints
        .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.price)}`)
        .join(" ")
    : "";

  const areaD = hasData && displayPoints.length > 1
    ? `${pathD} L ${toX(displayPoints.length - 1)} ${PAD.top + chartH} L ${toX(0)} ${PAD.top + chartH} Z`
    : "";

  const GRID_LINES = 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl bg-[#0d0d0d] border border-[#B85C38]/25 rounded-2xl shadow-[0_0_80px_rgba(184,92,56,0.12)] overflow-hidden"
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-white/8">
          <div className="min-w-0">
            <p className="text-[#B85C38] text-xs font-semibold uppercase tracking-widest mb-1">Historia cen</p>
            <h2
              className="text-white font-semibold text-lg leading-tight truncate"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              {productName}
            </h2>
            {currentPrice && (
              <p className="text-white/40 text-sm mt-0.5">
                Aktualna cena: <span className="text-[#B85C38] font-semibold">{currentPrice} €</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-4 w-9 h-9 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Range selector */}
        <div className="flex gap-2 px-6 pt-4 pb-2">
          {(["3m", "1y", "3y"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: range === r ? "linear-gradient(135deg, #B85C38, #D07A50)" : "rgba(255,255,255,0.06)",
                color: range === r ? "black" : "rgba(255,255,255,0.5)",
              }}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center h-[200px]">
              <div className="w-8 h-8 rounded-full border-t-2 border-[#B85C38] animate-spin" />
            </div>
          ) : (
            <div className="relative">
              <svg
                width="100%"
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="xMidYMid meet"
                className="overflow-visible"
              >
                {/* Grid lines */}
                {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
                  const y = PAD.top + (i / GRID_LINES) * chartH;
                  const value = hasData ? maxP - (i / GRID_LINES) * (maxP - minP) : null;
                  return (
                    <g key={i}>
                      <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y}
                        stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                      {value !== null && (
                        <text x={PAD.left - 6} y={y + 4} textAnchor="end"
                          fill="rgba(255,255,255,0.3)" fontSize="10">
                          {value.toFixed(0)}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* X-axis labels — show only 5 evenly spaced */}
                {displayPoints
                  .filter((_, i) => {
                    const step = Math.max(1, Math.floor(displayPoints.length / 5));
                    return i % step === 0 || i === displayPoints.length - 1;
                  })
                  .map((p, _, arr) => {
                    const origIdx = displayPoints.indexOf(p);
                    return (
                      <text
                        key={origIdx}
                        x={toX(origIdx)}
                        y={PAD.top + chartH + 20}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.3)"
                        fontSize="10"
                      >
                        {formatDateLabel(p.recorded_at, range)}
                      </text>
                    );
                  })}

                {/* Area fill */}
                {hasData && areaD && (
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#B85C38" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#B85C38" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                )}
                {hasData && areaD && (
                  <path d={areaD} fill="url(#priceGrad)" />
                )}

                {/* Line */}
                {hasData && (
                  <path d={pathD} fill="none" stroke="#B85C38" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" />
                )}

                {/* Data points */}
                {hasData && displayPoints.map((p, i) => (
                  <circle
                    key={i}
                    cx={toX(i)}
                    cy={toY(p.price)}
                    r="4"
                    fill="#0d0d0d"
                    stroke="#B85C38"
                    strokeWidth="2"
                  />
                ))}

                {/* Empty state overlay */}
                {!hasData && (
                  <text
                    x={W / 2}
                    y={H / 2}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.2)"
                    fontSize="13"
                  >
                    Brak danych historycznych dla tego produktu
                  </text>
                )}
              </svg>
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="px-6 pb-5 text-xs text-white/25 text-center">
          Dane aktualizowane automatycznie · ceny w EUR
        </div>
      </div>
    </div>
  );
}
