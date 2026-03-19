export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { userId, nick } = await request.json();

  if (!userId || !nick) {
    return NextResponse.json({ error: "Brak wymaganych danych" }, { status: 400 });
  }

  // Walidacja nicku
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(nick)) {
    return NextResponse.json(
      { error: "Nick: 3–20 znaków, tylko litery, cyfry i podkreślenie" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Sprawdź czy profil już istnieje
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (existing) {
    return NextResponse.json({ ok: true, profile: existing });
  }

  // Sprawdź unikalność nicku
  const { data: nickTaken } = await supabase
    .from("profiles")
    .select("id")
    .eq("nick", nick)
    .single();

  if (nickTaken) {
    return NextResponse.json({ error: "Ten nick jest już zajęty" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, nick })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ten nick jest już zajęty" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile: data });
}

// Pobierz profil lub auto-utwórz (dla istniejących użytkowników bez nicku)
export async function GET(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await anonClient.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Nieważny token" }, { status: 401 });

  const supabase = createServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile) return NextResponse.json({ profile });

  // Auto-utwórz profil dla starych kont
  const base = user.email
    ? user.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 14)
    : "user";
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  const nick = `${base}_${suffix}`;

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ id: user.id, nick })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: created, created: true });
}
