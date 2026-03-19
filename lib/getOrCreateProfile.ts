import { createServerClient } from "@/lib/supabaseServer";

/**
 * Pobiera profil użytkownika lub tworzy nowy z auto-wygenerowanym nickiem.
 * Używane przy logowaniu użytkowników bez profilu (przed wdrożeniem systemu nicków).
 */
export async function getOrCreateProfile(userId: string, email?: string) {
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (existing) return existing;

  // Generuj nick z emaila lub losowy
  const base = email
    ? email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 14)
    : "user";
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  const nick = `${base}_${suffix}`;

  const { data: created } = await supabase
    .from("profiles")
    .insert({ id: userId, nick })
    .select()
    .single();

  return created;
}
