export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth } from "@/lib/adminAuth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_MESSAGES = 20;
const MAX_TOTAL_CHARS = 10_000;
const MAX_PRODUCTS = 20;

/** Usuwa znaki nowej linii (główny wektor prompt injection) i przycina do maxLen. */
function sanitize(value: unknown, maxLen: number): string {
  return String(value ?? "").replace(/[\r\n]/g, " ").slice(0, maxLen);
}

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req.headers.get("Authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { messages, products } = await req.json();

    // 1. Odfiltruj wiadomości role=system i ogranicz historię
    const safeMessages = (Array.isArray(messages) ? messages : [])
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .slice(0, MAX_MESSAGES);

    // 2. Limit łącznej długości historii
    const totalChars = safeMessages.reduce((s: number, m: any) => s + String(m.content ?? "").length, 0);
    if (totalChars > MAX_TOTAL_CHARS) {
      return NextResponse.json({ error: "Message history too long" }, { status: 400 });
    }

    // 3. Sanityzacja danych produktów z localStorage (niezaufane źródło)
    const safeProducts = Array.isArray(products) ? products.slice(0, MAX_PRODUCTS) : [];
    const productList = safeProducts.length
      ? safeProducts
          .map(
            (p: any, i: number) =>
              `${i + 1}. ${sanitize(p.name, 150)}${p.price ? ` – ${sanitize(p.price, 20)} zł` : ""}${
                p.description ? `\n   ${sanitize(p.description, 250)}` : ""
              }`
          )
          .join("\n")
      : "Brak produktów w konfiguratorze.";

    const systemPrompt = `Jesteś ekspertem gitarowym w aplikacji Your Gear Advisor. Analizujesz zestaw gitarowy użytkownika i odpowiadasz na pytania dotyczące kompatybilności sprzętu, brzmienia, zastosowania praktycznego oraz możliwości łączenia urządzeń.

Aktualny zestaw użytkownika:
${productList}

Odpowiadaj po polsku, konkretnie i technicznie, ale przystępnie. Skupiaj się na sprzęcie gitarowym i muzycznym. Jeśli produkty są niekompatybilne lub zestawowi czegoś brakuje – powiedz o tym wprost. Jeśli zestaw jest pusty, zaproponuj użytkownikowi dodanie produktów z wyszukiwarki.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...safeMessages],
      max_tokens: 600,
      temperature: 0.7,
    });

    return NextResponse.json({
      reply: completion.choices[0]?.message?.content ?? "",
    });
  } catch (err: any) {
    // 4. Nie ujawniaj szczegółów błędu klientowi
    console.error("Konfigurator chat error:", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
