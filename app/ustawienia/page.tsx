"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AppSidebar } from "@/components/AppSidebar";
import { useSupabase } from "@/components/SupabaseProvider";
import Link from "next/link";

const AVATARS = [
  "/profile-avatars/avatar_black_strat.png",
  "/profile-avatars/avatar_sunburst_strat.png",
  "/profile-avatars/avatar_butterscotch_tele.png",
  "/profile-avatars/avatar_goldtop_lespaul.png",
  "/profile-avatars/avatar_red_prs.png",
  "/profile-avatars/avatar_black_ibanezsuperstrat.png",
  "/profile-avatars/avatar_red_jazzbass.png",
  "/profile-avatars/avatar_sunburst_jazbass.png",
  "/profile-avatars/avatar_black_ibanezbass.png",
];

interface Profile {
  id: string;
  nick: string;
  avatar_url: string | null;
  bio: string | null;
  is_admin: boolean;
}

export default function UstawieniaPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nick, setNick] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "deleting" | "done">("idle");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/auth/login"); return; }
      setUserEmail(session.user.email ?? "");

      const res = await fetch("/api/auth/create-profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setNick(data.profile.nick ?? "");
        setAvatarUrl(data.profile.avatar_url ?? AVATARS[0]);
        setBio(data.profile.bio ?? "");
      }
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    if (profile.is_admin && !/^[a-zA-Z0-9_]{3,20}$/.test(nick)) {
      setMsg("Nick: 3–20 znaków, tylko litery, cyfry i podkreślenie");
      return;
    }

    setSaving(true);
    setMsg("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const updatePayload: Record<string, unknown> = {
      avatar_url: avatarUrl || AVATARS[0],
      bio: bio.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (profile.is_admin) {
      updatePayload.nick = nick.trim();
    }

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", profile.id);

    setSaving(false);
    if (error) {
      if (error.code === "23505") setMsg("Ten nick jest już zajęty — wybierz inny");
      else setMsg("Błąd zapisu: " + error.message);
    } else {
      setMsg("✓ Zmiany zapisane");
      setTimeout(() => setMsg(""), 3000);
    }
  }

  async function handleDeleteAccount() {
    setDeleteStep("deleting");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setDeleteStep("idle"); return; }

    const res = await fetch("/api/auth/delete-account", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      setDeleteStep("idle");
      setMsg("Błąd podczas usuwania konta — spróbuj ponownie");
      return;
    }

    setDeleteStep("done");
    await supabase.auth.signOut();
    setTimeout(() => router.push("/"), 5000);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none" style={{ backgroundImage: "url('/ustawienia-bg.png')", zIndex: 0 }} />
        <div className="fixed inset-0 bg-gradient-to-t from-black via-black/75 to-black/55 pointer-events-none" style={{ zIndex: 0 }} />
        <AppSidebar />
        <svg className="relative z-10 animate-spin text-[#B85C38]" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none" style={{ backgroundImage: "url('/ustawienia-bg.png')", zIndex: 0 }} />
      <div className="fixed inset-0 bg-gradient-to-t from-black via-black/75 to-black/55 pointer-events-none" style={{ zIndex: 0 }} />
      <div className="fixed inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30 pointer-events-none" style={{ zIndex: 0 }} />
      <AppSidebar />
      <div className="relative z-10 md:ml-60 px-6 py-8 max-w-xl mx-auto">

        <div className="mb-8">
          <h1 className="text-white text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}>
            Ustawienia konta
          </h1>
          <p className="text-white/40 text-sm">Zarządzaj swoim profilem</p>
        </div>

        {/* Panel administracyjny — widoczny tylko dla admina */}
        {profile?.is_admin && (
          <div className="rounded-2xl p-6 mb-6" style={{ background: "rgba(184,92,56,0.08)", border: "2px solid rgba(184,92,56,0.4)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#B85C38]/20 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <p className="text-[#D07A50] text-xs uppercase tracking-widest font-semibold">Panel administratora</p>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              <p className="text-white/70 text-sm">Masz uprawnienia administratora. Przejdź do panelu, aby:</p>
              <ul className="text-white/50 text-sm list-none flex flex-col gap-1 pl-1">
                <li className="flex items-center gap-2"><span className="text-[#B85C38]">—</span> moderować posty użytkowników</li>
                <li className="flex items-center gap-2"><span className="text-[#B85C38]">—</span> zarządzać botami i ich harmonogramem</li>
                <li className="flex items-center gap-2"><span className="text-[#B85C38]">—</span> pisać posty i komentarze jako persona bota</li>
              </ul>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Otwórz panel admina
            </Link>
          </div>
        )}

        {/* Karta profilu */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: "rgba(12,12,12,0.85)", border: "2px solid rgba(184,92,56,0.55)" }}>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-5">Profil publiczny</p>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {/* Email (readonly) */}
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">Adres email</label>
              <input type="text" value={userEmail} disabled
                className="w-full text-white/40 text-sm rounded-xl px-4 py-3 outline-none border border-white/8 cursor-default"
                style={{ background: "rgba(0,0,0,0.3)", fontFamily: "var(--font-inter), sans-serif" }} />
            </div>

            {/* Nick + avatar thumbnail */}
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">
                Nick <span className="text-[#B85C38]">*</span>
                {!profile?.is_admin && (
                  <span className="ml-2 text-white/25 normal-case font-normal tracking-normal">— zablokowany</span>
                )}
              </label>
              <div className="flex items-center gap-3">
                {avatarUrl && (
                  <div className="flex-shrink-0 rounded-xl overflow-hidden" style={{ width: 44, height: 44, border: "2px solid rgba(184,92,56,0.5)" }}>
                    <Image src={avatarUrl} alt="Avatar" width={44} height={44} className="object-cover w-full h-full" />
                  </div>
                )}
                <input
                  type="text"
                  value={nick}
                  onChange={(e) => profile?.is_admin && setNick(e.target.value)}
                  disabled={!profile?.is_admin}
                  placeholder="Twój nick na forum"
                  maxLength={20}
                  className="flex-1 text-sm rounded-xl px-4 py-3 outline-none border transition-colors"
                  style={{
                    background: profile?.is_admin ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.2)",
                    color: profile?.is_admin ? "white" : "rgba(255,255,255,0.25)",
                    border: profile?.is_admin ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.05)",
                    cursor: profile?.is_admin ? "text" : "default",
                    fontFamily: "var(--font-inter), sans-serif",
                  }}
                />
              </div>
              <p className="text-white/25 text-xs mt-1">
                {profile?.is_admin
                  ? "3–20 znaków, litery, cyfry, podkreślenie. Widoczny na forum."
                  : "Nick jest przypisany do konta i nie może być samodzielnie zmieniony."}
              </p>
            </div>

            {/* Avatar picker */}
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-3">Wybierz avatar</label>
              <div className="grid grid-cols-3 gap-3">
                {AVATARS.map((src) => {
                  const selected = avatarUrl === src;
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setAvatarUrl(src)}
                      className="relative rounded-xl overflow-hidden transition-all hover:scale-[1.04]"
                      style={{
                        aspectRatio: "1",
                        border: selected ? "2px solid #B85C38" : "2px solid rgba(255,255,255,0.08)",
                        boxShadow: selected ? "0 0 0 2px rgba(184,92,56,0.3)" : "none",
                      }}
                    >
                      <Image src={src} alt="Avatar" fill className="object-cover" sizes="120px" />
                      {selected && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(184,92,56,0.18)" }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">Bio (opcjonalne)</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                placeholder="Kilka słów o sobie..."
                rows={3} maxLength={200}
                className="w-full text-white text-sm rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-[#B85C38]/50 transition-colors resize-none"
                style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-inter), sans-serif" }} />
              <p className="text-white/25 text-xs mt-1 text-right">{bio.length}/200</p>
            </div>

            {msg && (
              <p className={`text-xs ${msg.startsWith("✓") ? "text-[#D07A50]" : "text-red-400"}`}>{msg}</p>
            )}

            <button type="submit" disabled={saving}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm tracking-wide disabled:opacity-40 transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #B85C38, #D07A50)" }}>
              {saving ? "Zapisuję..." : "Zapisz zmiany"}
            </button>
          </form>
        </div>

        {/* Bezpieczeństwo */}
        <div className="rounded-2xl p-6" style={{ background: "rgba(12,12,12,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Bezpieczeństwo</p>
          <p className="text-white/50 text-sm mb-4">Aby zmienić hasło, wyślemy link resetujący na Twój adres email.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                await supabase.auth.resetPasswordForEmail(session.user.email ?? "", {
                  redirectTo: `${window.location.origin}/auth/update-password`,
                });
                setMsg("✓ Link resetujący wysłany na email");
                setTimeout(() => setMsg(""), 5000);
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-all w-fit"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              Wyślij link do zmiany hasła
            </button>

            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

            <button
              onClick={() => setDeleteStep("confirm")}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-red-400 transition-all w-fit"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              Usuń konto
            </button>
          </div>
        </div>
      </div>

      {/* Modal potwierdzenia usunięcia */}
      {(deleteStep === "confirm" || deleteStep === "deleting") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-8 flex flex-col items-center text-center"
            style={{ background: "rgba(14,14,14,0.98)", border: "2px solid rgba(184,92,56,0.45)" }}>
            <div className="w-12 h-12 rounded-xl mb-5 flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <h2 className="text-white text-lg font-bold mb-3" style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}>
              Usuń konto
            </h2>
            <p className="text-white/55 text-sm leading-relaxed mb-7">
              Zmierzasz do usunięcia konta. Czy na pewno chcesz to zrobić?
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setDeleteStep("idle")}
                disabled={deleteStep === "deleting"}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white transition-all disabled:opacity-40"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Nie
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteStep === "deleting"}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg,#c0392b,#e74c3c)" }}>
                {deleteStep === "deleting" ? "Usuwam..." : "Tak, usuń"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal sukcesu */}
      {deleteStep === "done" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-8 flex flex-col items-center text-center"
            style={{ background: "rgba(14,14,14,0.98)", border: "2px solid rgba(184,92,56,0.45)" }}>
            <div className="w-12 h-12 rounded-xl mb-5 flex items-center justify-center" style={{ background: "rgba(184,92,56,0.12)", border: "1px solid rgba(184,92,56,0.3)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D07A50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="text-white text-lg font-bold mb-3" style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}>
              Konto usunięte
            </h2>
            <p className="text-white/55 text-sm leading-relaxed">
              Twoje konto zostało usunięte. Dziękujemy, że byłeś z nami i zapraszamy ponownie!
            </p>
            <p className="text-white/25 text-xs mt-4">Za chwilę nastąpi przekierowanie…</p>
          </div>
        </div>
      )}
    </div>
  );
}
