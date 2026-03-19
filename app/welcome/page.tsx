"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/SupabaseProvider";

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    title: "Wyszukiwanie sprzętu",
    desc: "Opisz własnymi słowami czego szukasz — gitarę, wzmacniacz, efekt. AI przeszuka ponad tysiąc produktów i dopasuje najlepsze opcje do Twojego opisu, stylu i budżetu.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: "Inteligentny Doradca",
    desc: 'Zadawaj pytania techniczne na poziomie eksperta — "jaką gitarę do bluesa poniżej 2000 zł?", "humbucker czy single coil do jazzu?". Doradca odpowie rzeczowo i bez lania wody.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: "Aktualne ceny ze sklepów",
    desc: "Każdy produkt ma aktualizowane ceny z Thomann, Gear4Music i Riff.net.pl. Zobaczysz historię cen i wyłapiesz najlepszy moment na zakup.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
    title: "Konfigurator zestawu",
    desc: "Zbieraj upatrzone produkty w konfiguratorze i zapytaj AI czy do siebie pasują — czy ten wzmacniacz pasuje do tej gitary, czy efekty grają razem.",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const { supabase } = useSupabase();

  useEffect(() => {
    // Require logged-in session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      if (!user.email_confirmed_at) {
        supabase.auth.signOut();
        router.replace("/auth/register");
        return;
      }
      // Skip welcome if already seen this session
      if (sessionStorage.getItem("welcome_seen") === "true") {
        router.replace("/onboarding");
      }
    });
  }, []);

  function handleStart() {
    sessionStorage.setItem("welcome_seen", "true");
    router.push("/onboarding");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background glows */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-[0.06] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, #B85C38 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full opacity-[0.03] pointer-events-none"
        style={{ background: "radial-gradient(circle, #B85C38 0%, transparent 70%)" }}
      />

      <div className="relative w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-10">
          <a
            href="/"
            className="inline-block"
            style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
          >
            <span className="text-white font-bold text-2xl tracking-wide">Your </span>
            <span className="text-[#B85C38] font-bold text-2xl tracking-wide">Gear</span>
            <span className="text-white font-bold text-2xl tracking-wide"> Advisor</span>
          </a>
        </div>

        {/* Main card */}
        <div
          className="rounded-2xl p-8 md:p-10"
          style={{
            background: "rgba(8,8,8,0.85)",
            border: "2px solid rgba(184,92,56,0.55)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
          }}
        >
          {/* Heading */}
          <div className="mb-8 text-center">
            <p className="text-[#B85C38] text-xs font-semibold uppercase tracking-widest mb-4">
              Witaj w swoim nowym miejscu na gitarowe zakupy
            </p>
            <h1
              style={{
                fontFamily: "var(--font-instrument), Georgia, serif",
                fontSize: "clamp(1.5rem, 4vw, 2.1rem)",
                fontWeight: 400,
                lineHeight: 1.3,
                color: "white",
              }}
            >
              Tu redukujemy gitarowy szum informacyjny{" "}
              <span className="text-[#D07A50]">do przejrzystych porad.</span>
            </h1>
            <p
              className="mt-3 text-white/55"
              style={{
                fontFamily: "var(--font-instrument), Georgia, serif",
                fontSize: "clamp(1rem, 2vw, 1.15rem)",
                fontStyle: "italic",
                lineHeight: 1.5,
              }}
            >
              Twój osobisty doradca i ekspert gitarowy do Twojej dyspozycji.
            </p>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex flex-col gap-2 rounded-xl p-4"
                style={{
                  background: "rgba(184,92,56,0.05)",
                  border: "1px solid rgba(184,92,56,0.18)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(184,92,56,0.12)" }}
                  >
                    {f.icon}
                  </div>
                  <span
                    className="text-white font-semibold text-sm"
                    style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
                  >
                    {f.title}
                  </span>
                </div>
                <p className="text-white/50 text-xs leading-relaxed" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

          {/* CTA button */}
          <div className="flex justify-center">
            <button
              onClick={handleStart}
              className="px-10 py-4 rounded-xl font-bold text-white text-base tracking-wide transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_50px_rgba(184,92,56,0.45)]"
              style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)", fontFamily: "var(--font-instrument), Georgia, serif" }}
            >
              Dajmy temu wybrzmieć — zaczynamy!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
