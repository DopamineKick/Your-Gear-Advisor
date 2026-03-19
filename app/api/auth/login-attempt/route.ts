export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/adminAuth";

const MAX_ATTEMPTS = 5;

// ── In-memory rate limit (30 req/min per IP) ─────────────────────────────────
// Chroni przed masowym resetowaniem liczników i brute-force samego endpointu.
const ipMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = ipMap.get(ip);
  if (!rec || now > rec.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (rec.count >= RATE_LIMIT) return true;
  rec.count++;
  return false;
}

export async function POST(req: NextRequest) {
  // Rate limit po IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { email, outcome } = await req.json() as {
    email: string;
    outcome: "check" | "success" | "failure";
  };

  if (!email || !outcome) {
    return NextResponse.json({ error: "email and outcome required" }, { status: 400 });
  }

  // "success" wymaga ważnego tokena — użytkownik musi być już zalogowany
  if (outcome === "success") {
    const userId = await requireAuth(req.headers.get("Authorization"));
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const emailLower = email.toLowerCase().trim();

  const { data: record } = await supabase
    .from("login_security")
    .select("attempts, locked, locked_at")
    .eq("email", emailLower)
    .single();

  const currentAttempts = record?.attempts ?? 0;
  const isLocked = record?.locked ?? false;

  // ── Check lockout ────────────────────────────────────────────────────────
  if (outcome === "check") {
    return NextResponse.json({
      locked: isLocked,
      attempts: currentAttempts,
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - currentAttempts),
    });
  }

  // ── Successful login — reset counter ─────────────────────────────────────
  if (outcome === "success") {
    await supabase.from("login_security").upsert({
      email: emailLower,
      attempts: 0,
      locked: false,
      locked_at: null,
      last_attempt_at: new Date().toISOString(),
    });
    return NextResponse.json({ locked: false, attempts: 0, attemptsLeft: MAX_ATTEMPTS });
  }

  // ── Failed login — increment counter ─────────────────────────────────────
  if (outcome === "failure") {
    const newAttempts = currentAttempts + 1;
    const shouldLock = newAttempts >= MAX_ATTEMPTS;

    await supabase.from("login_security").upsert({
      email: emailLower,
      attempts: newAttempts,
      locked: shouldLock,
      locked_at: shouldLock ? new Date().toISOString() : (record?.locked_at ?? null),
      last_attempt_at: new Date().toISOString(),
    });

    const attemptsLeft = MAX_ATTEMPTS - newAttempts;

    return NextResponse.json({
      locked: shouldLock,
      attempts: newAttempts,
      attemptsLeft,
      warning: attemptsLeft === 1,
    });
  }

  return NextResponse.json({ error: "invalid outcome" }, { status: 400 });
}
