import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabaseServer";

/**
 * Weryfikuje token JWT i sprawdza czy użytkownik ma is_admin=true.
 * Zwraca userId lub null.
 */
export async function requireAdmin(authHeader: string | null): Promise<string | null> {
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await anonClient.auth.getUser(token);
  if (!user) return null;

  const supabase = createServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return profile?.is_admin ? user.id : null;
}

/**
 * Weryfikuje token JWT i zwraca userId (dla zwykłych zalogowanych akcji).
 */
export async function requireAuth(authHeader: string | null): Promise<string | null> {
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await anonClient.auth.getUser(token);
  return user?.id ?? null;
}
