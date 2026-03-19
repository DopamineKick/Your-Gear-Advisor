import "dotenv/config";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("🔄 Worker: przetwarzanie reasoning jobs...");

  // 1. Pobierz nieprzetworzone joby
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("*")
    .eq("processed", false)
    .eq("type", "generate_reasoning")
    .limit(20);

  if (jobsError) {
    console.error("❌ Błąd pobierania jobów:", jobsError);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log("Brak jobów do przetworzenia.");
    return;
  }

  console.log(`Znaleziono ${jobs.length} jobów do przetworzenia.`);

  for (const job of jobs) {
    try {
      console.log(`➡️ Przetwarzam job ${job.id} dla produktu ${job.product_id}`);

      // 2. Pobierz produkt + ai_profile
      const { data: product, error: productError } = await supabase
        .from("gear_items")
        .select("id, name, brand, type, tags, description, ai_profile")
        .eq("id", job.product_id)
        .single();

      if (productError || !product) {
        console.error("❌ Błąd pobierania produktu:", productError);
        continue;
      }

      // 3. Prompt do AI — reasoning na podstawie ai_profile
      const prompt = `
Użytkownik wpisał zapytanie: "${job.query}"

Masz profil produktu (JSON):
${JSON.stringify(product.ai_profile, null, 2)}

Masz też podstawowe dane produktu:
Nazwa: ${product.name}
Marka: ${product.brand}
Typ: ${product.type}
Tagi: ${product.tags}
Opis: ${product.description}

Twoje zadanie:
Napisz po polsku 300–500 znaków wyjaśnienia:
- dlaczego ten produkt pasuje lub nie pasuje do zapytania użytkownika,
- użyj informacji z ai_profile,
- bądź konkretny, rzeczowy, bez lania wody,
- jeśli produkt nie spełnia kryteriów (np. kolor, styl), powiedz to wprost.

Zwróć TYLKO tekst, bez JSON, bez komentarzy.
`;

      const aiResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Jesteś ekspertem od sprzętu muzycznego. Odpowiadasz po polsku, precyzyjnie i konkretnie.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      });

      const reasoning = aiResp.choices[0]?.message?.content ?? "";

      if (!reasoning || reasoning.length < 50) {
        console.warn("⚠️ AI zwróciło pustą lub zbyt krótką odpowiedź.");
        continue;
      }

      // 4. Zapis reasoning do cache
      const { error: insertError } = await supabase
        .from("ai_match_reasons")
        .insert({
          query_hash: job.query_hash,
          product_id: job.product_id,
          reason: reasoning,
        });

      if (insertError) {
        console.error("❌ Błąd zapisu reasoning:", insertError);
        continue;
      }

      // 5. Oznacz job jako processed
      const { error: updateError } = await supabase
        .from("jobs")
        .update({ processed: true })
        .eq("id", job.id);

      if (updateError) {
        console.error("❌ Błąd oznaczania joba jako processed:", updateError);
      } else {
        console.log(`✅ Job ${job.id} przetworzony.`);
      }
    } catch (e) {
      console.error("❌ Błąd w workerze:", e);
    }
  }

  console.log("🏁 Worker zakończył pracę.");
}

main();
