"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import Link from "next/link";

interface GuideItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  sort_order: number;
}

export default function PoradnikiZakupowePage() {
  const [guides, setGuides] = useState<GuideItem[]>([]);

  useEffect(() => {
    fetch("/api/content?type=guide")
      .then((r) => r.json())
      .then((d) => setGuides(d.items ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AppSidebar />

      <header
        className="fixed top-0 left-0 md:left-60 right-0 z-30 backdrop-blur-xl border-b"
        style={{ background: "rgba(0,0,0,0.85)", borderColor: "rgba(184,92,56,0.15)" }}
      >
        <div className="px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="w-10 md:hidden flex-shrink-0" />
          <nav className="flex items-center gap-2 text-xs text-white/35">
            <Link href="/onboarding" className="hover:text-white transition-colors">Szukaj</Link>
            <span>/</span>
            <span className="text-[#B85C38]">Poradniki zakupowe</span>
          </nav>
        </div>
      </header>

      <main className="pt-20 pb-20 px-4 md:ml-60">
        <div className="max-w-4xl mx-auto">

          <div className="mb-12">
            <p className="text-[#B85C38] text-xs font-semibold uppercase tracking-widest mb-3">
              Baza wiedzy
            </p>
            <h1
              className="text-white mb-3"
              style={{
                fontFamily: "var(--font-instrument), Georgia, serif",
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                fontWeight: 400,
              }}
            >
              Poradniki zakupowe
            </h1>
            <p className="text-white/45 text-sm max-w-xl">
              Tu regularnie będą pojawiać się nowe poradniki zakupowe na rok 2026.
            </p>
          </div>

          {guides.length === 0 ? (
            <div className="flex justify-center py-16">
              <svg className="animate-spin text-[#B85C38]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {guides.map((g, i) => (
                <Link key={g.id} href={`/poradniki-zakupowe/${g.slug}`} className="group">
                  <div
                    className="h-full flex flex-col p-6 rounded-2xl transition-all duration-200"
                    style={{ background: "rgba(255,255,255,0.03)", border: "2px solid rgba(184,92,56,0.55)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(184,92,56,0.85)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(184,92,56,0.55)")}
                  >
                    <span className="text-[#B85C38]/50 text-xs font-semibold uppercase tracking-widest mb-3">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2
                      className="text-white text-lg leading-snug flex-1 mb-3"
                      style={{ fontFamily: "var(--font-instrument), Georgia, serif", fontWeight: 400 }}
                    >
                      {g.title}
                    </h2>
                    <p className="text-white/45 text-sm leading-relaxed mb-5">{g.excerpt}</p>
                    <span className="text-[#B85C38] text-sm flex items-center gap-1.5 group-hover:gap-2.5 transition-all duration-200">
                      Czytaj poradnik <span>→</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
