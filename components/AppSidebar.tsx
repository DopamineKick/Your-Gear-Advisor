"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "./SupabaseProvider";

/* ── Icons ── */
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function IconHeart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}
function IconBook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}
function IconArticle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}
function IconWrench() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  );
}
function IconCamera() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}
function IconX() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

const STORAGE_SIGN_IN_KEY = "spolecznosc_last_sign_in";
const STORAGE_CLEARED_KEY = "spolecznosc_cleared_at";

interface SidebarContentProps {
  pathname: string;
  onClose: () => void;
  onLogout: () => void;
  newPosts: number;
  onCommunityClick: () => void;
  favoritesCount: number;
  configuratorCount: number;
  notificationsCount: number;
}

function SidebarContent({ pathname, onClose, onLogout, newPosts, onCommunityClick, favoritesCount, configuratorCount, notificationsCount }: SidebarContentProps) {
  const NAV_ITEMS = [
    { href: "/onboarding", label: "Wyszukiwarka sprzętu gitarowego", Icon: IconSearch },
    { href: "/konfigurator-zestawu", label: "Konfigurator zestawu gitarowego", Icon: IconWrench },
    { href: "/zdjecie-doradca", label: "Zdjęcie → Doradca AI", Icon: IconCamera },
    { href: "/favorites", label: "Ulubione produkty", Icon: IconHeart },
    { href: "/spolecznosc", label: "Dyskusje Społeczności", Icon: IconUsers },
    { href: "/poradniki-zakupowe", label: "Poradniki zakupowe", Icon: IconBook },
    { href: "/artykuly-i-ciekawostki", label: "Artykuły i ciekawostki", Icon: IconArticle },
    { href: "/powiadomienia", label: "Powiadomienia", Icon: IconBell },
    { href: "/ustawienia", label: "Ustawienia konta", Icon: IconSettings },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#B85C38]/20">
        <Link href="/onboarding" onClick={onClose}>
          <span
            className="font-bold text-lg tracking-wide"
            style={{ fontFamily: "var(--font-instrument), Georgia, serif" }}
          >
            <span className="text-white">Your </span>
            <span className="text-[#B85C38]">Gear</span>
            <span className="text-white"> Advisor</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const isCommunity = href === "/spolecznosc";
          const isFavorites = href === "/favorites";
          const isConfigurator = href === "/konfigurator-zestawu";
          const isNotifications = href === "/powiadomienia";

          const badge =
            isCommunity && newPosts > 0 ? newPosts :
            isFavorites && favoritesCount > 0 ? favoritesCount :
            isConfigurator && configuratorCount > 0 ? configuratorCount :
            isNotifications && notificationsCount > 0 ? notificationsCount :
            0;

          return (
            <Link
              key={href}
              href={href}
              onClick={() => {
                if (isCommunity) onCommunityClick();
                onClose();
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-[#B85C38]/15 text-[#B85C38] border border-[#B85C38]/30"
                  : "text-white/55 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <span className={active ? "text-[#B85C38]" : "text-white/40"}>
                <Icon />
              </span>
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span
                  className="flex items-center justify-center text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1"
                  style={{ background: "#B85C38" }}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/8">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200"
          style={{ background: "transparent", boxShadow: "none", padding: "12px 16px" }}
        >
          <span className="text-current"><IconLogout /></span>
          Wyloguj
        </button>
      </div>
    </div>
  );
}

function readLocalCounts() {
  let favs = 0, conf = 0;
  try { const r = localStorage.getItem("yga_favorites"); favs = Array.isArray(JSON.parse(r ?? "[]")) ? JSON.parse(r ?? "[]").length : 0; } catch {}
  try { const r = localStorage.getItem("configurator_items"); conf = Array.isArray(JSON.parse(r ?? "[]")) ? JSON.parse(r ?? "[]").length : 0; } catch {}
  return { favs, conf };
}

export function AppSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [newPosts, setNewPosts] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [configuratorCount, setConfiguratorCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const { supabase } = useSupabase();

  // Re-read localStorage counts on every navigation
  useEffect(() => {
    const { favs, conf } = readLocalCounts();
    setFavoritesCount(favs);
    setConfiguratorCount(conf);

    function onStorage() {
      const { favs: f, conf: c } = readLocalCounts();
      setFavoritesCount(f);
      setConfiguratorCount(c);
    }
    window.addEventListener("storage", onStorage);         // cross-tab
    window.addEventListener("yga-local-update", onStorage); // same-tab (dispatched by hooks)
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("yga-local-update", onStorage);
    };
  }, [pathname]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;

      const lastSignIn = session.user.last_sign_in_at ?? new Date().toISOString();
      const savedSignIn = localStorage.getItem(STORAGE_SIGN_IN_KEY);

      // New login detected — reset "cleared_at" to login time
      if (savedSignIn !== lastSignIn) {
        localStorage.setItem(STORAGE_SIGN_IN_KEY, lastSignIn);
        localStorage.setItem(STORAGE_CLEARED_KEY, lastSignIn);
      }

      const since = localStorage.getItem(STORAGE_CLEARED_KEY) ?? lastSignIn;

      try {
        const res = await fetch(`/api/community/posts-count?since=${encodeURIComponent(since)}`);
        if (res.ok) {
          const data = await res.json();
          setNewPosts(data.count ?? 0);
        }
      } catch {
        // ignore — badge stays at 0
      }
    });
  }, []);

  // Poll notifications unread count every 60s
  useEffect(() => {
    async function fetchUnread() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch("/api/notifications/unread-count", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotificationsCount(data.count ?? 0);
        }
      } catch {}
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, []);

  function handleCommunityClick() {
    setNewPosts(0);
    localStorage.setItem(STORAGE_CLEARED_KEY, new Date().toISOString());
  }

  async function handleLogout() {
    sessionStorage.removeItem("welcome_seen");
    await supabase.auth.signOut();
    router.push("/");
  }

  const sidebarProps = { pathname, onClose: () => {}, onLogout: handleLogout, newPosts, onCommunityClick: handleCommunityClick, favoritesCount, configuratorCount, notificationsCount };

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2.5 rounded-lg border border-[#B85C38]/25 text-white/70 hover:text-white"
        style={{
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
          boxShadow: "none",
          padding: "10px",
        }}
        aria-label="Otwórz menu"
      >
        <IconMenu />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-60 z-40 flex-col"
        style={{
          background: "rgba(5,5,5,0.97)",
          borderRight: "1px solid rgba(184,92,56,0.15)",
          backdropFilter: "blur(20px)",
        }}
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-in sidebar */}
          <aside
            className="relative w-72 h-full flex flex-col"
            style={{
              background: "rgba(5,5,5,0.98)",
              borderRight: "1px solid rgba(184,92,56,0.2)",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
              style={{ background: "transparent", boxShadow: "none", padding: "8px" }}
              aria-label="Zamknij menu"
            >
              <IconX />
            </button>

            <SidebarContent {...sidebarProps} onClose={() => setIsOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
