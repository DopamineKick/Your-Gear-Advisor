export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/adminAuth";

const DEFAULT_BOT_CONFIG = {
  persona_description: "",
  topics: [],
  system_prompt: `Jesteś użytkownikiem forum gitarowego. Piszesz jak człowiek – bez formatowania, bez wypunktowań, małymi literami czasami, z błędami interpunkcyjnymi. Co kilkanaście zdań mała literówka. Zdania krótkie, potoczne. Zero "Oczywiście!", "Świetne pytanie!". Pisz jakbyś klepał na klawiaturze.`,
  is_active: false,
  scheduling: {
    new_post: { enabled: true, min_delay_hours: 24, max_delay_hours: 96 },
    reply: { enabled: true, min_delay_minutes: 60, max_delay_minutes: 1440, reply_probability: 0.35 },
  },
};

// GET /api/admin/bots — lista wszystkich botów
export async function GET(request: NextRequest) {
  const adminId = await requireAdmin(request.headers.get("Authorization"));
  if (!adminId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nick, avatar_url, bot_config, next_post_at, next_reply_at, created_at")
    .eq("is_bot", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bots: data ?? [] });
}

// POST /api/admin/bots — utwórz nowego bota
export async function POST(request: NextRequest) {
  const adminId = await requireAdmin(request.headers.get("Authorization"));
  if (!adminId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { nick, avatar_url } = await request.json();
  if (!nick || !/^[a-zA-Z0-9_]{3,20}$/.test(nick)) {
    return NextResponse.json({ error: "Nieprawidłowy nick (3–20 znaków, a-z, 0-9, _)" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Utwórz konto Supabase Auth dla bota
  const botEmail = `bot_${nick.toLowerCase()}@yourgearadvisor.internal`;
  const botPassword = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: botEmail,
    password: botPassword,
    email_confirm: true,
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  const userId = authData.user.id;
  const now = new Date().toISOString();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      nick,
      avatar_url: avatar_url ?? null,
      is_bot: true,
      bot_config: DEFAULT_BOT_CONFIG,
      next_post_at: now,
      next_reply_at: now,
    })
    .select()
    .single();

  if (profileError) {
    // Rollback auth user
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ bot: profile });
}
