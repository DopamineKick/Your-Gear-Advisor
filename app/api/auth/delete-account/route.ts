export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const DELETION_EMAIL_HTML = (nick: string) => `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Konto usunięte – Your Gear Advisor</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 32px 0;">
              <span style="font-size:22px;font-weight:700;letter-spacing:0.5px;">
                <span style="color:#ffffff;">Your </span>
                <span style="color:#B85C38;">Gear</span>
                <span style="color:#ffffff;"> Advisor</span>
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:rgba(18,18,18,1);border:2px solid rgba(184,92,56,0.35);border-radius:20px;padding:40px 36px;">

              <!-- Icon -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="width:56px;height:56px;background:rgba(184,92,56,0.12);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;line-height:56px;text-align:center;">
                      <span style="font-size:26px;line-height:56px;">👋</span>
                    </div>
                  </td>
                </tr>

                <!-- Heading -->
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
                      Konto zostało usunięte
                    </h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <p style="margin:0 0 14px 0;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.65;text-align:center;">
                      Cześć${nick ? ` <strong style="color:#D07A50;">${nick}</strong>` : ""},
                    </p>
                    <p style="margin:0 0 14px 0;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.65;text-align:center;">
                      Potwierdzamy, że Twoje konto w <strong style="color:#B85C38;">Your Gear Advisor</strong> zostało trwale usunięte. Wszystkie Twoje dane zostały usunięte z naszych serwerów.
                    </p>
                    <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.65;text-align:center;">
                      Dziękujemy, że byłeś z nami — mamy nadzieję, że udało Ci się znaleźć wymarzone instrumenty! 🎸 Drzwi są zawsze otwarte, jeśli zechcesz wrócić.
                    </p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom:24px;">
                    <div style="height:1px;background:rgba(184,92,56,0.2);"></div>
                  </td>
                </tr>

                <!-- CTA -->
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <p style="margin:0 0 16px 0;font-size:13px;color:rgba(255,255,255,0.35);text-align:center;">
                      Chcesz do nas wrócić? Zarejestruj się ponownie:
                    </p>
                    <a href="https://yourgearadvisor.com/auth/register"
                       style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#B85C38,#D07A50);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px;letter-spacing:0.3px;">
                      Wróć do Your Gear Advisor
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 0 0 0;">
              <p style="margin:0 0 4px 0;font-size:12px;color:rgba(255,255,255,0.2);">
                Your Gear Advisor · admin@yourgearadvisor.com
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.12);">
                Ta wiadomość została wysłana automatycznie po usunięciu konta.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });

  // Verify user via anon client
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Nieważny token" }, { status: 401 });

  const userEmail = user.email ?? "";

  // Fetch nick for personalised email
  const adminClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: profile } = await adminClient
    .from("profiles")
    .select("nick")
    .eq("id", user.id)
    .single();
  const nick = (profile as any)?.nick ?? "";

  // Delete user (cascades to profiles via FK or RLS)
  const { error: deleteErr } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  // Send confirmation email via SMTP (optional — skip if env vars not set)
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpHost && smtpUser && smtpPass && userEmail) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT ?? "587"),
        secure: (process.env.SMTP_PORT ?? "587") === "465",
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: `"Your Gear Advisor" <${smtpUser}>`,
        to: userEmail,
        subject: "Twoje konto zostało usunięte – Your Gear Advisor",
        html: DELETION_EMAIL_HTML(nick),
      });
    } catch {
      // Email failure is non-fatal — account is already deleted
    }
  }

  return NextResponse.json({ ok: true });
}
