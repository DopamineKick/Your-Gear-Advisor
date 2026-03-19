// lib/enrichment/enrichItem.ts
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export async function enrichItem(rawItem: any) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const prompt = `
Jesteś ekspertem od sprzętu gitarowego. Twoim zadaniem jest wyciągnięcie WSZYSTKICH istotnych parametrów produktu, które pomogą użytkownikom znaleźć idealny sprzęt.

DANE PRODUKTU:
Nazwa: ${rawItem.name_raw}
Opis: ${rawItem.description_raw}
Kategoria: ${rawItem.category_raw}

Zwróć odpowiedź WYŁĄCZNIE jako poprawny JSON:
{
  "brand": string | null,
  "type": string | null,
  "tags": string[],
  "description": string
}

ZASADY:

"type" — WAŻNE zasady klasyfikacji:
• Struny gitarowe/basowe → "accessory"
• Przetworniki/pickupy (humbucker, single coil, P90, piezo) → "accessory"
• Statywy, pokrowce, futerały, kable, paski, kostki, kapodastry, strojniki, siodełka, nakrętki, tuby → "accessory"
• Gitary elektryczne → "electric_guitar"
• Gitary akustyczne/elektroakustyczne → "acoustic_guitar"
• Gitary klasyczne/nylonowe → "classical_guitar"
• Gitary basowe → "bass_guitar"
• Wzmacniacze gitarowe/basowe → "amp"
• Efekty gitarowe, pedały → "pedal"
• Pozostałe → "other"

"description" — zwięzły opis produktu WYŁĄCZNIE po polsku, max 600 znaków. Jeśli opis źródłowy jest po niemiecku lub angielsku, przetłumacz go w całości na polski. NIE kopiuj obcojęzycznych fragmentów do opisu.

"tags" — KRYTYCZNE. Zasady tworzenia tagów:
• Tagi WYŁĄCZNIE po angielsku lub po polsku — NIE po niemiecku ani innym języku. Nawet pojedyncze słowa przetłumacz (np. "Saiten" → "strings", "Gitarre" → "guitar", "für" → pomiń).
• NIE dodawaj tagów o gwarancji, zwrotach, promocjach (np. NIE: "money back guarantee", "3 years warranty", "30 dni gwarancji") — TYLKO parametry techniczne produktu.
• NIE używaj nazw typów produktów jako tagów (np. NIE: "electric_guitar", "acoustic_guitar").
• Wyczerpująca lista tagów wyciągniętych z nazwy, opisu i specyfikacji. Tagi muszą pokrywać WSZYSTKIE poniższe kategorie, które dotyczą danego produktu:

Dla GITAR (electric_guitar / acoustic_guitar / classical_guitar / bass_guitar):
• Kolory: wypisz KAŻDY kolor z nazwy lub opisu (po angielsku i po polsku, np. "sunburst", "sonic yellow", "żółty", "olympic white", "biały", "black", "czarny", "butterscotch", "vintage blonde", "surf green", "zielony", "natural", "naturalny", "3-tone sunburst")
• Drewno body: np. "alder body", "mahogany body", "basswood body", "ash body", "olcha", "mahoń", "lipa"
• Drewno szyjki: np. "maple neck", "mahogany neck", "klon szyjka"
• Materiał podstrunnicy: np. "rosewood fretboard", "ebony fretboard", "maple fretboard", "laurel fretboard", "palisander", "heban", "klon podstrunnica"
• Liczba progów: np. "22 frets", "24 frets", "22 progi", "24 progi"
• Promień podstrunnicy: np. "9.5 inch radius", "12 inch radius", "7.25 inch radius", "compound radius"
• Kształt profilu szyjki: np. "c-shape neck", "u-shape neck", "d-shape neck", "slim taper neck", "modern c neck"
• Typ mostka: np. "floyd rose tremolo", "synchronized tremolo", "fixed bridge", "tune-o-matic bridge", "hardtail", "bigsby", "wrap-around bridge"
• Konfiguracja przetworników: np. "SSS", "HSS", "HH", "HS", "single coil", "humbucker", "P90", "active pickups", "passive pickups"
• Liczba strun: np. "6-string", "7-string", "8-string", "12-string", "4-string", "5-string"
• Skala: np. "25.5 inch scale", "24.75 inch scale", "short scale", "long scale"
• Styl muzyczny pasujący do instrumentu: np. "country", "blues", "metal", "jazz", "rock", "fingerstyle", "funk", "indie"
• Poziom gracza: np. "beginner", "intermediate", "professional", "entry level", "budżetowy", "dla początkujących"
• Inne cechy: np. "lefthanded", "leworęczna", "vintage", "modern", "hollow body", "semi-hollow", "solid body", "cutaway", "no cutaway"

Dla WZMACNIACZY (amp):
• Moc: np. "1 watt", "5 watts", "20 watts", "50 watts", "100 watts"
• Technologia: np. "tube amp", "lampowy", "all-valve", "solid state", "tranzystorowy", "modeling amp", "cyfrowy", "hybrid amp", "class a"
• Typ: np. "combo", "head", "cabinet", "2x12 cabinet", "1x12 combo", "stack"
• Rozmiar głośnika: np. "8 inch speaker", "10 inch speaker", "12 inch speaker"
• Liczba kanałów: np. "single channel", "2-channel", "3-channel", "4-channel"
• Efekty wbudowane: np. "built-in reverb", "built-in delay", "effects loop", "tremolo", "vibrato"
• Styl/przeznaczenie: np. "blues amp", "metal amp", "jazz amp", "country amp", "practice amp", "stage amp", "recording amp"

Dla EFEKTÓW/PEDAŁÓW (pedal):
• Typ efektu: np. "overdrive", "distortion", "fuzz", "delay", "reverb", "chorus", "flanger", "phaser", "wah", "compressor", "noise gate", "looper", "tuner", "boost", "preamp", "eq", "octave", "pitch shifter", "harmonizer", "tremolo", "vibrato", "uni-vibe", "multi-effects", "modulation"
• Charakterystyka: np. "analog", "digital", "true bypass", "buffered bypass", "boutique", "vintage voiced"
• Zasilanie: np. "9V battery", "9V adapter", "18V", "USB power", "battery powered"
• Przeznaczenie: np. "guitar pedal", "bass pedal", "studio pedal"

Dla AKCESORIÓW (accessory):
• Typ: np. "strap", "pasek", "capo", "kapodaster", "picks", "kostki", "strings", "struny", "tuner", "strojnik", "cable", "kabel", "stand", "statyw"
• Materiał / parametry specyficzne dla danego akcesorium

"brand" — marka wyciągnięta z nazwy (np. "Fender", "Gibson", "Marshall", "Boss", "Ibanez")

JSON musi być poprawny składniowo. Nie pomijaj żadnej kategorii tagów jeśli dane są dostępne w nazwie lub opisie.
`;

  const aiRes = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    response_format: { type: "json_object" },
  });

  const rawText = aiRes.choices[0].message?.content ?? "";
  const jsonStart = rawText.indexOf("{");
  const jsonEnd = rawText.lastIndexOf("}");
  const jsonString = rawText.slice(jsonStart, jsonEnd + 1);

  let enriched;
  try {
    enriched = JSON.parse(jsonString);
  } catch (err) {
    console.error("Failed to parse enrichment JSON:", rawText);
    throw err;
  }

  // UPSERT zamiast INSERT — kluczowa poprawka
  const { error } = await supabase
    .from("gear_items")
    .upsert(
      {
        id: rawItem.id,
        name: rawItem.name_raw,
        brand: enriched.brand,
        type: enriched.type,
        tags: enriched.tags,
        description: enriched.description,
        image_url: rawItem.image_url_raw,
        price: rawItem.price_raw,
        product_url: rawItem.product_url,
        created_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    console.error("Failed to upsert enriched item:", error);
    throw error;
  }

  return enriched;
}
