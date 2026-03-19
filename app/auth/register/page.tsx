"use client";

import { useState } from "react";
import { useSupabase } from "@/components/SupabaseProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const { supabase } = useSupabase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nick, setNick] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Hasła nie są identyczne.");
      return;
    }
    if (password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(nick)) {
      setError("Nick: 3–20 znaków, tylko litery, cyfry i podkreślenie (bez spacji).");
      return;
    }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/welcome`,
      },
    });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    // Utwórz profil z nickiem (przez service-role API)
    if (data.user) {
      await fetch("/api/auth/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.user.id, nick }),
      });
    }

    setLoading(false);

    // email_confirmed_at is the source of truth — null means confirmation required
    if (!data.user?.email_confirmed_at) {
      if (data.session) {
        await supabase.auth.signOut();
      }
      setSuccess(true);
      return;
    }

    // Email was immediately confirmed (Confirm email disabled in Supabase)
    router.push("/welcome");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06] pointer-events-none"
        style={{ background: "radial-gradient(circle, #B85C38 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-md">
        {/* Logo link */}
        <div className="text-center mb-10">
          <Link href="/"
            className="inline-block font-playfair text-2xl font-bold tracking-wide"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            <span className="text-white">Your </span>
            <span className="text-[#B85C38]">Gear</span>
            <span className="text-white"> Advisor</span>
          </Link>
          <p className="text-white/40 text-sm mt-2">Utwórz swoje konto — to bezpłatne</p>
        </div>

        {/* Card */}
        <div className="bg-black/50 border border-[#B85C38]/20 backdrop-blur-xl rounded-2xl p-8 shadow-[0_0_60px_rgba(0,0,0,0.6)]">
          <h1
            className="font-playfair text-white text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Rejestracja
          </h1>
          <p className="text-white/40 text-sm mb-8">Zacznij odkrywać swój idealny sprzęt</p>

          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-[#B85C38]/10 border border-[#B85C38]/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <p className="text-white font-semibold text-lg mb-2"
                style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}>
                Sprawdź swoją skrzynkę!
              </p>
              <p className="text-white/55 text-sm leading-relaxed max-w-xs mx-auto">
                Wysłaliśmy link aktywacyjny na adres{" "}
                <span className="text-[#B85C38]">{email}</span>.
                Kliknij go, aby aktywować konto i zalogować się.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-medium uppercase tracking-wider">
                  Nick <span className="text-[#B85C38]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Twój nick na forum (np. gitarowy_blues)"
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  maxLength={20}
                  required
                />
                <p className="text-white/25 text-xs">Widoczny publicznie. 3–20 znaków, bez spacji.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-medium uppercase tracking-wider">
                  Adres email
                </label>
                <input
                  type="email"
                  placeholder="gitarzysta@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-medium uppercase tracking-wider">
                  Hasło
                </label>
                <input
                  type="password"
                  placeholder="Minimum 6 znaków"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                    Tworzę konto...
                  </span>
                ) : (
                  "Utwórz konto bezpłatnie"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Login link */}
        <p className="text-center text-white/40 text-sm mt-6">
          Masz już konto?{" "}
          <Link href="/auth/login" className="text-[#B85C38] hover:text-white font-medium transition-colors">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}
