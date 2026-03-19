"use client";

import { useState } from "react";
import { useSupabase } from "@/components/SupabaseProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ── Warning popup (shown after 4th failed attempt) ── */
function WarningPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl p-7 shadow-[0_0_80px_rgba(0,0,0,0.8)]"
        style={{
          background: "#111111",
          border: "1px solid rgba(239,68,68,0.4)",
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5"
            style={{ background: "rgba(239,68,68,0.12)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3
              className="text-white font-semibold text-base mb-2"
              style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
            >
              Ostatnia szansa
            </h3>
            <p className="text-white/65 text-sm leading-relaxed">
              Pozostała ci <span className="text-red-400 font-semibold">ostatnia próba</span> wpisania hasła.
              Jeśli się nie powiedzie, Twoje hasło zostanie zdezaktywowane ze względów bezpieczeństwa.
              Będziesz mógł wtedy utworzyć nowe hasło przez opcję{" "}
              <span className="text-white/90">&quot;Nie pamiętasz hasła?&quot;</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200"
          style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          Rozumiem, spróbuję ponownie
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { supabase } = useSupabase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [accountLocked, setAccountLocked] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 1. Check lockout status first
    const checkRes = await fetch("/api/auth/login-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, outcome: "check" }),
    });
    const checkData = await checkRes.json();

    if (checkData.locked) {
      setAccountLocked(true);
      setLoading(false);
      return;
    }

    // 2. Attempt login
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (!authError) {
      // Success — reset counter (wymaga tokena, więc pobieramy sesję)
      const { data: { session } } = await supabase.auth.getSession();
      await fetch("/api/auth/login-attempt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ email, outcome: "success" }),
      });
      router.push("/welcome");
      return;
    }

    // 3. Login failed — handle "email not confirmed" separately (don't count as brute-force attempt)
    if (authError.message.toLowerCase().includes("email not confirmed")) {
      setLoading(false);
      setError("Twój adres email nie został jeszcze potwierdzony. Sprawdź skrzynkę pocztową i kliknij link aktywacyjny.");
      return;
    }

    // 4. Wrong credentials — record failure and check state
    const failRes = await fetch("/api/auth/login-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, outcome: "failure" }),
    });
    const failData = await failRes.json();

    setLoading(false);

    if (failData.locked) {
      setAccountLocked(true);
      return;
    }

    if (failData.warning) {
      setShowWarning(true);
      return;
    }

    const attemptsLeft = failData.attemptsLeft ?? 0;
    setError(
      attemptsLeft > 1
        ? `Nieprawidłowy email lub hasło. Pozostało ${attemptsLeft} prób.`
        : "Nieprawidłowy email lub hasło."
    );
  };

  return (
    <>
      {showWarning && <WarningPopup onClose={() => setShowWarning(false)} />}

      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.05] pointer-events-none"
          style={{ background: "radial-gradient(circle, #B85C38 0%, transparent 70%)" }} />

        <div className="relative w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-10">
            <Link href="/"
              className="inline-block font-playfair text-2xl font-bold tracking-wide"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              <span className="text-white">Your </span>
              <span className="text-[#B85C38]">Gear</span>
              <span className="text-white"> Advisor</span>
            </Link>
            <p className="text-white/40 text-sm mt-2">Zaloguj się i odkryj swój idealny sprzęt</p>
          </div>

          {/* Card */}
          <div className="bg-black/50 border border-[#B85C38]/20 backdrop-blur-xl rounded-2xl p-8 shadow-[0_0_60px_rgba(0,0,0,0.6)]">
            <h1
              className="font-playfair text-white text-2xl font-bold mb-1"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              Logowanie
            </h1>
            <p className="text-white/40 text-sm mb-8">Witaj z powrotem</p>

            {/* Locked account message */}
            {accountLocked ? (
              <div className="flex flex-col gap-4">
                <div
                  className="flex items-start gap-3 text-sm px-4 py-4 rounded-xl"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span className="leading-relaxed">
                    Twoje konto zostało <strong>zablokowane</strong> ze względów bezpieczeństwa po zbyt wielu nieudanych próbach logowania.
                    Utwórz nowe hasło, aby odblokować dostęp.
                  </span>
                </div>
                <Link
                  href="/auth/reset-password"
                  className="w-full py-3.5 rounded-xl font-bold text-white text-sm tracking-wide text-center transition-all duration-300 hover:scale-[1.02] block"
                  style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
                >
                  Zresetuj hasło
                </Link>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="flex flex-col gap-4" autoComplete="on">
                <div className="flex flex-col gap-1.5">
                  <label className="text-white/60 text-xs font-medium uppercase tracking-wider">
                    Adres email
                  </label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="twoj@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-white/60 text-xs font-medium uppercase tracking-wider">
                      Hasło
                    </label>
                    <Link href="/auth/reset-password" className="text-xs text-[#B85C38]/70 hover:text-[#B85C38] transition-colors">
                      Nie pamiętasz hasła?
                    </Link>
                  </div>
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="Twoje hasło"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full py-3.5 rounded-xl font-bold text-black text-sm tracking-wide transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: loading ? "#6b4c3b" : "linear-gradient(135deg, #B85C38, #D07A50)" }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                      Loguję...
                    </span>
                  ) : (
                    "Zaloguj się"
                  )}
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-white/40 text-sm mt-6">
            Nie masz jeszcze konta?{" "}
            <Link href="/auth/register" className="text-[#B85C38] hover:text-white font-medium transition-colors">
              Zarejestruj się bezpłatnie
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
