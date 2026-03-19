export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth } from "@/lib/adminAuth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const MAX_MESSAGES = 20;
const MAX_TOTAL_CHARS = 10_000;

/** Usuwa znaki nowej linii (główny wektor prompt injection) i przycina do maxLen. */
function sanitize(value: unknown, maxLen: number): string {
  return String(value ?? "").replace(/[\r\n]/g, " ").slice(0, maxLen);
}

const SYSTEM_PROMPT = `Jesteś ekspertem i doradcą sprzętu gitarowego w aplikacji Your Gear Advisor.
Pomagasz gitarzystom podejmować świadome decyzje zakupowe.

Możesz rozmawiać wyłącznie o:
- Sprzęcie gitarowym (gitary, wzmacniacze, efekty, akcesoria)
- Specyfikacjach technicznych produktów
- Porównaniach sprzętu
- Stylach gry i ich wymaganiach sprzętowych
- Poradach dotyczących zakupu gitarowego sprzętu

Jeśli użytkownik zapyta o tematy niezwiązane ze sprzętem gitarowym lub muzyką gitarową,
grzecznie odmów i przekieruj rozmowę na tematy gitarowe.

Odpowiadaj zwięźle, konkretnie i po polsku. Używaj wiedzy technicznej, ale tłumacz ją przystępnie.`;

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req.headers.get("Authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { messages, productContext } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    // 1. Odfiltruj wiadomości role=system (blokuje wstrzyknięcie dodatkowych instrukcji)
    const safeMessages = messages
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .slice(0, MAX_MESSAGES);

    // 2. Limit łącznej długości historii
    const totalChars = safeMessages.reduce((s: number, m: any) => s + String(m.content ?? "").length, 0);
    if (totalChars > MAX_TOTAL_CHARS) {
      return NextResponse.json({ error: "Message history too long" }, { status: 400 });
    }

    // 3. Sanityzacja productContext — usunięcie znaków nowej linii (wektor injection)
    const systemContent = productContext
      ? `${SYSTEM_PROMPT}\n\nKONTEKST PRODUKTU:\nNazwa: ${sanitize(productContext.name, 200)}\nOpis: ${sanitize(productContext.description, 500)}\nCena: ${productContext.price ? sanitize(productContext.price, 20) + " EUR" : "nieznana"}`
      : SYSTEM_PROMPT;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContent },
        ...safeMessages,
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "Przepraszam, nie mogłem wygenerować odpowiedzi.";
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
