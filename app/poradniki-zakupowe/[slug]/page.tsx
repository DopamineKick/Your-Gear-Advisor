"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import Link from "next/link";

interface ContentItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
}

function renderParagraph(para: string, i: number) {
  if (para.startsWith("**") && para.endsWith("**")) {
    return (
      <h3 key={i} className="text-[#D07A50] text-lg mt-6 mb-2" style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}>
        {para.replace(/\*\*/g, "")}
      </h3>
    );
  }
  if (para.startsWith("- **")) {
    const match = para.match(/^- \*\*(.+?)\*\*:? *(.*)/);
    if (match) {
      return (
        <p key={i} className="text-white/60 text-sm leading-relaxed pl-4">
          <span className="text-[#B85C38] mr-1">–</span>
          <strong className="text-white/80">{match[1]}:</strong>{" "}{match[2]}
        </p>
      );
    }
  }
  if (para.startsWith("- ")) {
    return (
      <p key={i} className="text-white/60 text-sm leading-relaxed pl-4">
        <span className="text-[#B85C38] mr-1">–</span>
        {para.slice(2)}
      </p>
    );
  }
  if (/^\d+\./.test(para)) {
    return (
      <p key={i} className="text-white/60 text-sm leading-relaxed pl-4">
        <span className="text-[#B85C38] mr-1">•</span>
        {para.replace(/^\d+\. /, "")}
      </p>
    );
  }
  return (
    <p key={i} className="text-white/65 text-sm leading-relaxed">
      {para.replace(/\*\*(.+?)\*\*/g, "$1")}
    </p>
  );
}

export default function GuideSlugPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [guide, setGuide] = useState<ContentItem | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/content/${slug}?type=guide`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => d && setGuide(d.item));
  }, [slug]);

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
            <Link href="/poradniki-zakupowe" className="hover:text-white transition-colors">Poradniki zakupowe</Link>
            {guide && (
              <>
                <span>/</span>
                <span className="text-[#B85C38] truncate max-w-[160px]">{guide.title.split("–")[0].trim()}</span>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="pt-20 pb-20 px-4 md:ml-60">
        <div className="max-w-3xl mx-auto">

          <Link
            href="/poradniki-zakupowe"
            className="inline-flex items-center gap-1.5 text-[#B85C38]/70 hover:text-[#B85C38] text-sm mb-10 transition-colors"
          >
            ← Wszystkie poradniki
          </Link>

          {notFound ? (
            <p className="text-white/50">Nie znaleziono poradnika.</p>
          ) : !guide ? (
            <div className="flex justify-center py-16">
              <svg className="animate-spin text-[#B85C38]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
            </div>
          ) : (
            <>
              <h1
                className="text-white mb-10"
                style={{
                  fontFamily: "var(--font-instrument), Georgia, serif",
                  fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                  fontWeight: 400,
                  lineHeight: 1.25,
                }}
              >
                {guide.title}
              </h1>
              <div className="space-y-3 max-w-2xl">
                {guide.content.split("\n").filter(Boolean).map((para, i) => renderParagraph(para, i))}
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
