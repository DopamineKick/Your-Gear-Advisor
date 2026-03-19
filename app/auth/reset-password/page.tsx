"use client";

import { useState } from "react";
import { useSupabase } from "@/components/SupabaseProvider";
import Link from "next/link";

export default function ResetPasswordPage() {
  const { supabase } = useSupabase();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Sprawdź swoją skrzynkę mailową — wysłaliśmy link do resetu hasła.");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.05] pointer-events-none"
        style={{ background: "radial-gradient(circle, #B85C38 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/"
            className="inline-block font-playfair text-2xl font-bold tracking-wide"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            <span className="text-white">Your </span>
            <span className="text-[#B85C38]">Gear</span>
            <span className="text-white"> Advisor</span>
          </Link>
        </div>

        <div className="bg-black/50 border border-[#B85C38]/20 backdrop-blur-xl rounded-2xl p-8 shadow-[0_0_60px_rgba(0,0,0,0.6)]">
          <h1
            className="font-playfair text-white text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Reset hasła
          </h1>
          <p className="text-white/40 text-sm mb-8">Podaj email, wyślemy Ci link resetujący</p>

          {message ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-14 h-14 bg-[#B85C38]/10 border border-[#B85C38]/40 rounded-full flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <p className="text-white/80 text-sm">{message}</p>
              <Link href="/auth/login" className="text-[#B85C38] text-sm hover:text-white transition-colors">
                Wróć do logowania
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-medium uppercase tracking-wider">
                  Adres email
                </label>
                <input
                  type="email"
                  placeholder="twoj@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3.5 rounded-xl font-bold text-black text-sm tracking-wide"
                style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
              >
                {loading ? "Wysyłam..." : "Wyślij link resetujący"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-white/40 text-sm mt-6">
          <Link href="/auth/login" className="text-[#B85C38] hover:text-white transition-colors">
            ← Wróć do logowania
          </Link>
        </p>
      </div>
    </div>
  );
}
