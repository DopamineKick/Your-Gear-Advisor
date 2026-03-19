"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { useSupabase } from "@/components/SupabaseProvider";

interface Notification {
  id: string;
  type: "mention" | "reply" | "admin_message" | "broadcast";
  content: string;
  post_id: string | null;
  from_nick: string | null;
  is_read: boolean;
  is_broadcast: boolean;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} ${d === 1 ? "dzień" : "dni"} temu`;
  if (h > 0) return `${h} ${h === 1 ? "godzinę" : "godz."} temu`;
  if (m > 0) return `${m} min temu`;
  return "przed chwilą";
}

function NotifIcon({ type }: { type: Notification["type"] }) {
  if (type === "mention") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
      </svg>
    );
  }
  if (type === "reply") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    );
  }
  // admin_message / broadcast
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

export default function PowiadomieniaPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/auth/login"); return; }
      setToken(session.access_token);
      try {
        const res = await fetch("/api/notifications", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      } catch {}
      setLoading(false);
    });
  }, []);

  async function handleClick(notif: Notification) {
    if (!token) return;

    // Mark as read
    if (!notif.is_read) {
      await fetch(`/api/notifications/${notif.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_broadcast: notif.is_broadcast }),
      });
      setNotifications((prev) =>
        prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n)
      );
    }

    // Redirect to post if applicable
    if (notif.post_id && (notif.type === "mention" || notif.type === "reply")) {
      router.push(`/spolecznosc/${notif.post_id}`);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AppSidebar />
      <div className="md:ml-60 px-6 py-8 max-w-2xl mx-auto">
        <h1
          className="text-white text-3xl font-bold mb-2"
          style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
        >
          Powiadomienia
        </h1>
        <p className="text-white/40 text-sm mb-8">Wzmianki, odpowiedzi i wiadomości od admina</p>

        {loading ? (
          <div className="flex justify-center py-16">
            <svg className="animate-spin text-[#B85C38]" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <svg className="mx-auto mb-4 text-white/15" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <p className="text-lg">Brak powiadomień</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((notif) => (
              <button
                key={`${notif.is_broadcast ? "bc" : "n"}-${notif.id}`}
                onClick={() => handleClick(notif)}
                className="text-left rounded-xl px-4 py-3.5 transition-all duration-200 hover:scale-[1.005] flex items-start gap-3"
                style={{
                  background: notif.is_read ? "rgba(12,12,12,0.6)" : "rgba(184,92,56,0.08)",
                  border: notif.is_read
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "1px solid rgba(184,92,56,0.35)",
                }}
              >
                <span
                  className="mt-0.5 flex-shrink-0"
                  style={{ color: notif.is_read ? "rgba(255,255,255,0.3)" : "#B85C38" }}
                >
                  <NotifIcon type={notif.type} />
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: notif.is_read ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.85)",
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                    }}
                  >
                    {notif.content}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {notif.from_nick && (
                      <span className="text-xs" style={{ color: "#B85C38" }}>
                        {notif.from_nick}
                      </span>
                    )}
                    <span className="text-xs text-white/25">{timeAgo(notif.created_at)}</span>
                    {!notif.is_read && (
                      <span
                        className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: "#B85C38" }}
                      />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
