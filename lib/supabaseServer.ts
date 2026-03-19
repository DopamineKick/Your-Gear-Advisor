import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, // URL jest publiczny
    process.env.SUPABASE_SERVICE_ROLE_KEY! // sekretny klucz serwerowy
  );
}
