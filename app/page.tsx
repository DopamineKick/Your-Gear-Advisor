"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/SupabaseProvider";

/* ── Scroll Reveal wrapper ── */
function ScrollReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Icons ── */
function IconBolt() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconBarChart() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconAdvisor() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconChevronDown() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/* ── Navbar ── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-black/80 backdrop-blur-xl border-b border-[#B85C38]/20 shadow-lg shadow-black/50"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-xl font-bold tracking-wide"
            style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
          >
            <span className="text-white">Your </span>
            <span className="text-[#B85C38]">Gear</span>
            <span className="text-white"> Advisor</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-white/80 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10"
          >
            Zaloguj się
          </Link>
          <Link
            href="/auth/register"
            className="text-sm font-semibold text-white px-5 py-2 rounded-lg hover:shadow-[0_0_20px_rgba(184,92,56,0.5)] transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
          >
            Zarejestruj się
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero Section ── */
function HeroSection() {
  const router = useRouter();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/landing-bg.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/90" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 text-[#B85C38] text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-8 animate-fade-in-up animate-delay-100"
          style={{ background: "rgba(184,92,56,0.1)", border: "1px solid rgba(184,92,56,0.4)" }}>
          <span className="w-1.5 h-1.5 bg-[#B85C38] rounded-full animate-pulse" />
          Wersja Beta · Dostęp bezpłatny
        </div>

        {/* Main title */}
        <h1
          className="animate-fade-in-up animate-delay-200 text-white leading-none tracking-tight mb-6"
          style={{
            fontFamily: "var(--font-instrument), Georgia, serif",
            fontSize: "clamp(3.5rem, 9vw, 8rem)",
            fontWeight: 400,
            textShadow: "0 4px 40px rgba(0,0,0,0.8)",
          }}
        >
          Your Gear<br />
          <span
            style={{
              background: "linear-gradient(135deg, #B85C38 0%, #D07A50 50%, #c8966c 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Advisor
          </span>
        </h1>

        {/* Tagline */}
        <p
          className="animate-fade-in-up animate-delay-300 text-white/80 italic mb-10"
          style={{
            fontFamily: "var(--font-instrument), Georgia, serif",
            fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)",
            textShadow: "0 2px 20px rgba(0,0,0,0.9)",
            lineHeight: 1.5,
          }}
        >
          Twój osobisty doradca sprzętu gitarowego.<br />
          <span className="text-white/60" style={{ fontSize: "0.85em" }}>
            Koniec z setkami otwartych kart i niepewnością — wybieramy tylko to, co gra dla Ciebie.
          </span>
        </p>

        {/* CTA buttons */}
        <div className="animate-fade-in-up animate-delay-400 flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <button
            onClick={() => router.push("/auth/register")}
            className="group relative overflow-hidden text-white font-bold text-base px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(184,92,56,0.6)]"
            style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
          >
            <span className="relative z-10">Przetestuj za darmo</span>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
          </button>
          <a
            href="#plans"
            className="flex items-center gap-2 text-white/70 hover:text-white font-medium text-base transition-colors"
          >
            Poznaj plany
            <IconChevronDown />
          </a>
        </div>

        {/* Stats strip */}
        <div className="animate-fade-in-up animate-delay-600 flex flex-wrap items-start justify-center gap-x-8 gap-y-5 text-sm">
          {[
            { value: "10 000+", label: "produktów gitarowych" },
            { value: "AI", label: "Twój osobisty doradca" },
            { value: "∞", label: "popularne sklepy muzyczne" },
            { value: "Społeczność", label: "Dołącz do elitarnej grupy gitarzystów dzielących się poradami i wiedzą" },
            { value: "Materiały edukacyjne", label: "Poradniki i artykuły ze świata gitarowego" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 max-w-[150px] text-center">
              <span
                className="font-bold text-2xl text-[#B85C38]"
                style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
              >
                {stat.value}
              </span>
              <span className="text-white/50 text-xs leading-snug">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/40">
        <IconChevronDown />
      </div>
    </section>
  );
}

/* ── Features Section ── */
function FeaturesSection() {
  const features = [
    {
      icon: <IconBolt />,
      title: "Rekomendacje napędzane AI",
      description:
        "Opisz czego szukasz własnymi słowami. Nasz silnik semantyczny przeanalizuje setki produktów i dobierze te najlepiej pasujące do Twojego stylu gry i budżetu.",
    },
    {
      icon: <IconSearch />,
      title: "Inteligentne dopasowanie",
      description:
        "Nie wpisuj nazw produktów — opisz brzmienie, które chcesz uzyskać. AI rozumie kontekst: vintage blues, heavy metal, fingerpicking i wiele więcej.",
    },
    {
      icon: <IconBarChart />,
      title: "Konfigurator sprzętu gitarowego",
      description:
        "Wyszukaj ulubione produkty, skonfiguruj z nich wymarzony sprzęt i przeanalizuj jego parametry i możliwości z Twoim osobistym Inteligentnym Doradcą.",
    },
    {
      icon: <IconAdvisor />,
      title: "Wsparcie doświadczonej społeczności",
      description:
        "Udzielaj się na forum, dziel się spostrzeżeniami z rosnącą społecznością ludzi wzajemnie wspierających się w eksplorowaniu świata gitary.",
    },
  ];

  return (
    <section className="relative py-32 bg-gradient-to-b from-black to-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center mb-20">
            <p className="text-[#B85C38] text-sm font-semibold uppercase tracking-widest mb-4">
              Jak to działa
            </p>
            <h2
              className="text-white"
              style={{
                fontFamily: "var(--font-instrument), Georgia, serif",
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              Znajdź swój idealny sprzęt
              <br />
              <span style={{
                background: "linear-gradient(135deg, #B85C38, #c8966c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>w kilka sekund</span>
            </h2>
          </div>
        </ScrollReveal>

        {/* Feature cards — 2x2 on md, 4 cols on xl */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <ScrollReveal key={i} delay={i * 80}>
              <div
                className="group relative p-8 rounded-2xl border transition-all duration-400 h-full"
                style={{
                  borderColor: "rgba(184,92,56,0.15)",
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 4px 40px rgba(0,0,0,0.4)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(184,92,56,0.4)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.6)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(184,92,56,0.15)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.4)";
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-[#B85C38] mb-6"
                  style={{
                    background: "rgba(184,92,56,0.1)",
                    border: "1px solid rgba(184,92,56,0.25)",
                  }}
                >
                  {f.icon}
                </div>
                <h3
                  className="text-white text-xl font-semibold mb-3"
                  style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
                >
                  {f.title}
                </h3>
                <p className="text-white/55 leading-relaxed text-sm">{f.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing Section ── */
function PricingSection() {
  const router = useRouter();

  const plans = [
    {
      id: "standard",
      badge: "Dostępne teraz",
      badgeColor: "text-black",
      badgeBg: "linear-gradient(135deg, #B85C38, #D07A50)",
      name: "Standard",
      price: "Bezpłatnie",
      priceNote: "przez cały okres beta",
      description: "Pełny dostęp do rekomendacji AI bez żadnych ograniczeń.",
      features: [
        "Rekomendacje oparte na AI",
        "Dostęp do ponad tysiąca produktów gitarowych",
        "Dostęp do zamkniętej Społeczności",
        "Do 10 zapytań o produkty dziennie i do 3 pytań do Inteligentnego Doradcy o konkretny produkt dziennie.",
      ],
      cta: "Przetestuj za darmo",
      ctaAction: () => router.push("/auth/register"),
      available: true,
      highlight: true,
    },
    {
      id: "max",
      badge: "Dostępne wkrótce",
      badgeColor: "text-[#c8966c]",
      badgeBg: "rgba(59,47,47,0.8)",
      name: "Max",
      price: "9,99 zł",
      priceNote: "/ miesiąc",
      description: "Dla gitarzystów, którzy chcą więcej. Rozszerzone możliwości i ekskluzywne treści.",
      features: [
        "Wszystko z wersji Standard",
        "Do 30 zapytań o produkty dziennie i do 30 pytań do Inteligentnego Doradcy o konkretny produkt dziennie",
        "Dostęp do ekskluzywnych treści edukacyjnych (podstawowe zagadnienia teorii gry na gitarze/basie oraz dostęp do extra artykułów i poradników)",
      ],
      cta: "Dostępne wkrótce",
      available: false,
      highlight: false,
    },
  ];

  return (
    <section id="plans" className="relative py-32 bg-[#0a0a0a]">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#B85C38 1px, transparent 1px), linear-gradient(90deg, #B85C38 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-20">
            <p className="text-[#B85C38] text-sm font-semibold uppercase tracking-widest mb-4">
              Plany i cennik
            </p>
            <h2
              className="text-white mb-4"
              style={{
                fontFamily: "var(--font-instrument), Georgia, serif",
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              Wybierz swój plan
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Zacznij bezpłatnie w wersji beta. Płatne plany będą dostępne wkrótce
              z jeszcze większymi możliwościami.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start max-w-3xl mx-auto">
          {plans.map((plan, i) => (
            <ScrollReveal key={plan.id} delay={i * 100}>
              <div
                className="relative rounded-2xl p-8 flex flex-col gap-6 transition-all duration-300"
                style={{
                  border: plan.highlight ? "2px solid #B85C38" : "1px solid rgba(59,47,47,0.5)",
                  background: plan.highlight ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.3)",
                  opacity: plan.highlight ? 1 : 0.7,
                  transform: plan.highlight ? "scale(1.02)" : "scale(1)",
                  boxShadow: plan.highlight ? "0 0 60px rgba(184,92,56,0.18)" : "none",
                }}
              >
                {/* Badge */}
                <span
                  className={`self-start text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${plan.badgeColor}`}
                  style={{ background: plan.badgeBg, border: plan.highlight ? "none" : "1px solid rgba(200,150,108,0.3)" }}
                >
                  {plan.badge}
                </span>

                {/* Plan name */}
                <div>
                  <h3
                    className={`text-2xl font-semibold mb-1 ${plan.highlight ? "text-[#B85C38]" : "text-white/60"}`}
                    style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
                  >
                    {plan.name}
                  </h3>
                  <p className="text-white/45 text-sm">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-white/40"}`}
                    style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-white/40 text-sm">{plan.priceNote}</span>
                </div>

                <div className={`h-px ${plan.highlight ? "bg-[#B85C38]/30" : "bg-white/10"}`} />

                {/* Features */}
                <ul className="flex flex-col gap-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <span className={`flex-shrink-0 mt-0.5 ${plan.highlight ? "text-[#B85C38]" : "text-white/30"}`}>
                        <IconCheck />
                      </span>
                      <span className={`text-sm leading-snug ${plan.highlight ? "text-white/80" : "text-white/35"}`}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {plan.available ? (
                  <button
                    onClick={plan.ctaAction}
                    className="mt-auto w-full py-3.5 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(184,92,56,0.4)]"
                    style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
                  >
                    {plan.cta}
                  </button>
                ) : (
                  <button
                    disabled
                    className="mt-auto w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide bg-[#1a1a1a] text-white/30 border border-white/10 cursor-not-allowed"
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── CTA Banner ── */
function CtaBanner() {
  const router = useRouter();

  return (
    <section className="relative py-28 overflow-hidden">
      <ScrollReveal>
        <div className="absolute inset-0 bg-gradient-to-r from-[#180800] via-[#0a0a0a] to-[#180800]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #B85C38 0%, transparent 70%)" }}
        />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-white mb-4"
            style={{
              fontFamily: "var(--font-instrument), Georgia, serif",
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 400,
            }}
          >
            Gotowy na swój{" "}
            <span style={{
              background: "linear-gradient(135deg, #B85C38, #c8966c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              idealny dźwięk?
            </span>
          </h2>
          <p className="text-white/55 mb-10 text-lg">
            Dołącz do gitarzystów, którzy już korzystają z rekomendacji AI.
            Dostęp bezpłatny w całym okresie beta.
          </p>

          <button
            onClick={() => router.push("/auth/register")}
            className="group relative inline-flex items-center gap-3 font-bold text-white text-lg px-10 py-4 rounded-xl transition-all duration-300 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #B85C38, #D07A50)",
              boxShadow: "0 0 40px rgba(184,92,56,0.3)",
            }}
          >
            Sprawdź Your Gear Advisor
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </ScrollReveal>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer className="border-t border-[#3b2f2f]/40 py-10 bg-black">
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-4 text-center">
        <span
          className="text-white/60 text-sm"
          style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
        >
          Your Gear Advisor · Beta
        </span>
        <p className="text-white/30 text-xs">
          © 2026 Your Gear Advisor. Designed and built by{" "}
          <a
            href="https://flovante.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 hover:text-[#B85C38] transition-colors"
          >
            flovante.com
          </a>
        </p>
        <p className="text-white/35 text-xs">
          Problemy z działaniem aplikacji? Skontaktuj się z nami pod adresem{" "}
          <a
            href="mailto:admin@yourgearadvisor.com"
            className="text-[#B85C38] hover:text-[#D07A50] transition-colors"
          >
            admin@yourgearadvisor.com
          </a>
        </p>
      </div>
    </footer>
  );
}

/* ── Page ── */
/* ── Cookie Banner ── */
function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookies_accepted")) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("cookies_accepted", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-5 left-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] sm:w-80 rounded-2xl p-5 flex flex-col gap-4 shadow-[0_8px_40px_rgba(0,0,0,0.7)]"
      style={{
        background: "#111111",
        border: "1px solid rgba(255,255,255,0.12)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <div>
        <p className="text-white text-sm font-semibold mb-1.5">Pliki cookie</p>
        <p className="text-white/50 text-xs leading-relaxed">
          Używamy plików cookie wyłącznie do celów technicznych (sesja, preferencje). Nie profilujemy użytkowników ani nie sprzedajemy danych.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={accept}
          className="flex-1 text-xs font-semibold py-2.5 rounded-xl transition-all duration-200 hover:opacity-90"
          style={{ background: "#ffffff", color: "#0a0a0a" }}
        >
          Akceptuję
        </button>
        <button
          onClick={accept}
          className="flex-1 text-xs font-medium py-2.5 rounded-xl transition-all duration-200"
          style={{
            background: "transparent",
            color: "rgba(255,255,255,0.45)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)")}
        >
          Tylko niezbędne
        </button>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { supabase } = useSupabase();

  // Redirect logged-in users to onboarding
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/onboarding");
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <CtaBanner />
      <Footer />
      <CookieBanner />
    </main>
  );
}
