"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/SupabaseProvider";
import { type AuthChangeEvent } from "@supabase/supabase-js";
import Link from "next/link";

type Mode = "loading" | "form" | "success" | "invalid";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [mode, setMode] = useState<Mode>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Supabase JS wykrywa token recovery z hash URL i emituje PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("form");
      }
    });

    // Fallback: jeśli sesja recovery już aktywna (np. odświeżenie strony)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setMode("form");
      } else {
        setTimeout(() => {
          setMode((prev) => (prev === "loading" ? "invalid" : prev));
        }, 2500);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }
    if (password !== confirm) {
      setError("Hasła nie są identyczne.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMode("success");
    setTimeout(() => router.push("/ustawienia"), 3000);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.05] pointer-events-none"
        style={{ background: "radial-gradient(circle, #B85C38 0%, transparent 70%)" }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link
            href="/"
            className="inline-block text-2xl font-bold tracking-wide"
            style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
          >
            <span className="text-white">Your </span>
            <span className="text-[#B85C38]">Gear</span>
            <span className="text-white"> Advisor</span>
          </Link>
        </div>

        <div className="bg-black/50 border border-[#B85C38]/20 backdrop-blur-xl rounded-2xl p-8 shadow-[0_0_60px_rgba(0,0,0,0.6)]">

          {/* Loading */}
          {mode === "loading" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <svg className="animate-spin text-[#B85C38]" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
              <p className="text-white/40 text-sm">Weryfikuję link...</p>
            </div>
          )}

          {/* Invalid / wygasły link */}
          {mode === "invalid" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h1
                className="text-white text-xl font-bold mb-2"
                style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
              >
                Link wygasł lub jest nieprawidłowy
              </h1>
              <p className="text-white/40 text-sm leading-relaxed mb-6">
                Linki resetujące są jednorazowe i ważne przez 24 godziny.<br />Wygeneruj nowy poniżej.
              </p>
              <Link
                href="/auth/reset-password"
                className="inline-block px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
              >
                Wyślij nowy link
              </Link>
            </div>
          )}

          {/* Formularz */}
          {mode === "form" && (
            <>
              <h1
                className="text-white text-2xl font-bold mb-1"
                style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
              >
                Nowe hasło
              </h1>
              <p className="text-white/40 text-sm mb-8">Ustaw nowe hasło do swojego konta</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-white/60 text-xs font-medium uppercase tracking-wider">
                    Nowe hasło
                  </label>
                  <input
                    type="password"
                    placeholder="Minimum 6 znaków"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-white/60 text-xs font-medium uppercase tracking-wider">
                    Potwierdź hasło
                  </label>
                  <input
                    type="password"
                    placeholder="Wpisz hasło ponownie"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full py-3.5 rounded-xl font-bold text-white text-sm tracking-wide transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: loading ? "#6b4c3b" : "linear-gradient(135deg, #B85C38, #D07A50)" }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                      Zapisuję...
                    </span>
                  ) : (
                    "Ustaw nowe hasło"
                  )}
                </button>
              </form>
            </>
          )}

          {/* Sukces */}
          {mode === "success" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-[#B85C38]/10 border border-[#B85C38]/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2
                className="text-white text-xl font-bold mb-2"
                style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
              >
                Hasło zmienione!
              </h2>
              <p className="text-white/40 text-sm">
                Za chwilę wrócisz do ustawień...
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
