export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/adminAuth";
import { createClient } from "@supabase/supabase-js";

// POST /api/admin/messages — send broadcast or direct admin message
export async function POST(req: NextRequest) {
  const userId = await requireAuth(req.headers.get("Authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { content, target, nick, email } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "Treść komunikatu jest wymagana" }, { status: 400 });
  }

  if (target === "all") {
    const { error } = await supabase
      .from("admin_broadcasts")
      .insert({ content: content.trim() });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, message: "Komunikat wysłany do wszystkich użytkowników" });
  }

  if (target === "user") {
    if (!nick && !email) {
      return NextResponse.json({ error: "Podaj nick lub email odbiorcy" }, { status: 400 });
    }

    // Find user by nick or email
    let recipientId: string | null = null;

    if (nick) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("nick", nick.trim())
        .single();
      recipientId = data?.id ?? null;
    }

    if (!recipientId && email) {
      // Look up auth.users via service role to find by email, then match profile
      const { data: authData } = await supabase.auth.admin.listUsers();
      const found = authData?.users?.find(
        (u: any) => u.email?.toLowerCase() === email.trim().toLowerCase()
      );
      if (found) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", found.id)
          .single();
        recipientId = profileData?.id ?? null;
      }
    }

    if (!recipientId) {
      return NextResponse.json({ error: "Użytkownik nie znaleziony" }, { status: 404 });
    }

    const { error } = await supabase.from("notifications").insert({
      user_id: recipientId,
      type: "admin_message",
      from_nick: "Admin",
      content: content.trim(),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, message: "Wiadomość wysłana do użytkownika" });
  }

  return NextResponse.json({ error: "Nieprawidłowy cel (target)" }, { status: 400 });
}
