export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getQueryEmbedding } from "@/lib/embedding";
import { findSimilarGear } from "@/lib/similarity";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import crypto from "crypto";
import { requireAuth } from "@/lib/adminAuth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ---------------------------------------------------------------------------
// Krok 1 — Analiza zapytania (1 call GPT, szybkie)
// Cel: uzyskać semanticQuery do embeddingu + twarde ograniczenia (kolor, artyści do unikania)
// ---------------------------------------------------------------------------
interface QueryAnalysis {
  semanticQuery: string;    // opis techniczny → wejście do embeddingu
  colorKeywords: string[];  // synonimy koloru → filtr po similarity search
  artistsToAvoid: string[]; // sygnatury innych artystów → penalizacja
  allowedTypes: string[] | null; // typ instrumentu → filtr SQL gdy regex zwróci null
}

async function analyzeQuery(rawQuery: string, inspiration: string = ""): Promise<QueryAnalysis> {
  const fallbackText = [rawQuery, inspiration].filter(Boolean).join(" ") || rawQuery;
  const fallback: QueryAnalysis = { semanticQuery: fallbackText, colorKeywords: [], artistsToAvoid: [], allowedTypes: null };
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Jesteś ekspertem sprzętu muzycznego z encyklopedyczną wiedzą o WSZYSTKICH artystach, gatunkach i ich sprzęcie.
Użytkownik wypełnił dwa pola wyszukiwarki. Zwracasz JSON z TRZEMA polami.

"semanticQuery" — KOMPAKTOWE słowa kluczowe PO ANGIELSKU (max 80 słów, NIE zdania).

ZASADA 1 — TYP INSTRUMENTU z "Czego szukasz?" jest BEZWZGLĘDNY i nienaruszalny przez inspirację:
• gitara akustyczna / elektroakustyczna → acoustic guitar [NIGDY electric guitar ani amplifier]
• gitara basowa → bass guitar [NIGDY regular guitar]
• gitara klasyczna → classical guitar nylon
• wzmacniacz → amplifier [NIGDY guitar]
• pedał / efekt (np. "efekt wah", "pedał delay", "efekt gitarowy") → effects pedal konkretnego typu [NIGDY amplifier]
• gitara elektryczna lub ogólna gitara → electric guitar
• "Czego szukasz?" puste → wywnioskuj typ z inspiracji

ZASADA 2 — INSPIRACJA: użyj PEŁNEJ WŁASNEJ wiedzy encyklopedycznej.
Jesteś jak doświadczony doradca w sklepie muzycznym który ZNA sprzęt każdego artysty na świecie.
Przekształć artystę lub gatunek w TECHNICZNE cechy pasujące do podanego TYPU.
NIE ograniczaj się do żadnej listy — znasz sprzęt każdego artysty z własnej wiedzy.
Myśl: "Jakiego konkretnego modelu słynie ten artysta? Jakie ma brzmienie? Jakie pedały?"
NIE wymieniaj nazwisk artystów w semanticQuery — tylko cechy techniczne.

ZASADA 3 — Bądź konkretny: marka model pickup-config materiały gatunek brzmienie kolor.

PRZYKŁADY FORMATU (nie lista artystów — tylko format odpowiedzi):
"efekt gitarowy wah" + Kirk Hammett → "wah pedal Dunlop Cry Baby wah filter sweep heavy metal Metallica rhythm"
"gitara elektryczna" + Slash → "Gibson Les Paul Standard HH humbucker PAF mahogany maple hard rock bluesy"
"gitara basowa" + Jaco Pastorius → "Fender Jazz Bass fretless 4-string jazz fusion melodic warm sustain"
"wzmacniacz" + AC/DC → "tube amplifier Marshall Plexi 100W British crunch hard rock high volume"
"gitara akustyczna" + John Mayer → "acoustic guitar dreadnought warm fingerstyle blues folk resonant"
"gitara elektryczna żółta" + country → "Fender Telecaster SS yellow butterscotch country twang bright clear"
"pedał" + The Edge (U2) → "digital delay dotted eighth reverb ambient modulation clean"
"" + Jimi Hendrix → "Fender Stratocaster SSS vintage psychedelic rock single coil alder maple"

"allowedTypes" — typ(y) instrumentu jako tablica. Dozwolone wartości: "electric_guitar", "acoustic_guitar", "classical_guitar", "bass_guitar", "amp", "pedal". Używaj własnej wiedzy encyklopedycznej:
• "stratocaster", "telecaster", "les paul", "sg", "strat", "tele" → ["electric_guitar"]
• "jazz bass", "precision bass", "p-bass", "j-bass", "fretless bass" → ["bass_guitar"]
• "marshall", "fender twin", "combo", "head cabinet" → ["amp"]
• "overdrive", "delay", "reverb", "wah", "fuzz", "distortion" → ["pedal"]
• Jeśli typ niepewny lub mieszany → null

"colorKeywords" — synonimy koloru z DOWOLNEGO pola, PO ANGIELSKU. Krótkie słowa (wystarczy "yellow" żeby złapało "Hialeah Yellow").
czerwona→["red","cherry","candy apple red","dakota red","crimson","scarlet","ferrari red","wine red"]
czarna→["black","jet black","midnight black","gloss black"]
biała→["white","cream","vintage white","ivory","olympic white","arctic white","pearl white"]
żółta→["yellow","sonic yellow","butterscotch","vintage yellow","canary yellow"]
niebieska→["blue","sonic blue","daphne blue","lake placid blue","ocean blue","arctic blue","navy"]
zielona→["green","surf green","seafoam green","sage green","forest green","olive"]
sunburst→["sunburst","tobacco sunburst","cherry sunburst","burst","3-tone sunburst","2-tone sunburst"]
naturalna→["natural","blonde","honey","vintage natural","satin natural"]
szara→["gray","grey","silver","charcoal","graphite","pewter"]
fioletowa→["purple","violet","plum","grape","lavender"]
pomarańczowa→["orange","tangerine","fiesta red","copper"]
Jeśli brak koloru w żadnym polu: [].

"artistsToAvoid" — gdy w inspiracji jest artysta, wymień innych artystów z sygnaturami ZUPEŁNIE NIEZGODNYMI.
Używaj własnej wiedzy. NIE wymieniaj artystów z tym samym typem instrumentu — ich sygnatury to dobre fallbacki.
Jeśli brak artysty: [].`,
        },
        {
          role: "user",
          content: `Czego szukasz: ${rawQuery || "(brak)"}\nInspiracja (artysta lub styl): ${inspiration || "(brak)"}`,
        },
      ],
    });
    const p = JSON.parse(res.choices[0].message?.content || "{}");
    const VALID_TYPES = new Set(["electric_guitar", "acoustic_guitar", "classical_guitar", "bass_guitar", "amp", "pedal"]);
    const gptTypes = Array.isArray(p.allowedTypes)
      ? p.allowedTypes.map((s: unknown) => String(s)).filter((s) => VALID_TYPES.has(s))
      : null;
    return {
      semanticQuery: typeof p.semanticQuery === "string" && p.semanticQuery.trim() ? p.semanticQuery.trim() : rawQuery,
      colorKeywords: Array.isArray(p.colorKeywords) ? p.colorKeywords.map((s: unknown) => String(s).toLowerCase()) : [],
      artistsToAvoid: Array.isArray(p.artistsToAvoid) ? p.artistsToAvoid.map((s: unknown) => String(s)) : [],
      allowedTypes: gptTypes && gptTypes.length > 0 ? gptTypes : null,
    };
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Krok 2 — GPT Reranker
// Cel: z przefiltrowanej puli 15 kandydatów wybrać najlepsze 5.
// Reranker widzi prawdziwe nazwy produktów → może zastosować wiedzę o świecie.
// Np. "Frusciante" → wie że to Fender Stratocaster, a nie Rickenbacker.
// ---------------------------------------------------------------------------
async function rerankWithGPT(originalQuery: string, candidates: any[], artistsToAvoid: string[], colorKeywords: string[] = [], artistInspiration: string = ""): Promise<any[]> {
  if (candidates.length <= 5) return candidates;
  try {
    const list = candidates
      .map((c, i) => `${i + 1}. ${c.name} | ${c.type ?? "?"} | ${(c.tags ?? []).slice(0, 6).join(", ")}`)
      .join("\n");

    const avoidNote = artistsToAvoid.length > 0
      ? `\nARTYŚCI DO UNIKANIA W NAZWACH PRODUKTÓW: ${artistsToAvoid.join(", ")}` +
        `\nJeśli produkt ma w nazwie któregoś z tych artystów, wybierz go tylko jako ostateczność gdy nie ma nic lepszego.\n`
      : "";

    const colorNote = colorKeywords.length > 0
      ? `\nWYMAGANY KOLOR: ${colorKeywords.join(", ")} — wybieraj WYŁĄCZNIE produkty zawierające te słowa w nazwie lub tagach. Kolor to wymóg bezwzględny.\n`
      : "";

    const artistBoostNote = artistInspiration.trim()
      ? `\nBOOST ARTYSTY: "${artistInspiration}" — jeśli jakiś produkt ma w nazwie imię lub nazwisko tego artysty, UMIEŚĆ GO NA POZYCJI 1 jako absolutny priorytet.\n`
      : "";

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 50,
      messages: [
        {
          role: "system",
          content:
            "Jesteś ekspertem sprzętu gitarowego z wiedzą encyklopedyczną o muzykach i ich sprzęcie. " +
            "Na podstawie zapytania użytkownika wybierz dokładnie 5 RÓŻNYCH numerów produktów które DOŚWIADCZONY DORADCA muzyczny by polecił.\n" +
            "ZASADY (w kolejności ważności):\n" +
            "0. KOMPLETNY INSTRUMENT: Nigdy nie wybieraj samych korpusów (body), szyjek (neck), kluczyków ani luźnych części jeśli user szuka kompletnego instrumentu. " +
            "Produkt musi być gotowym do grania instrumentem lub urządzeniem, nie komponentem do budowy.\n" +
            "1. KOLOR (jeśli podany w zapytaniu): BEZWZGLĘDNY PRIORYTET. Wybieraj TYLKO produkty z wymaganym kolorem w nazwie lub tagach. " +
            "Jeśli mniej niż 5 produktów ma wymagany kolor, dobierz resztę z najlepiej pasujących stylistycznie — ale kolorowe zawsze na pierwszych miejscach.\n" +
            "2. TYP INSTRUMENTU: gitara elektryczna, akustyczna, wzmacniacz, pedał — zgodnie z zapytaniem.\n" +
            "3. STYL/GATUNEK i ARTYSTA: użyj wiedzy o stylu muzycznym — country=Telecaster, metal=humbucker, blues=Strat/Les Paul, jazz=hollow body.\n" +
            "4. RÓŻNORODNOŚĆ: nie wybieraj dwóch identycznych modeli (różne konfiguracje tego samego modelu to ok).\n" +
            "5. SYGNATURY: jeśli w inspiracji podano konkretnego artystę, produkty z jego imieniem/nazwiskiem w nazwie to TOP kandydaci — stawiaj je na pierwszym miejscu. " +
            "Unikaj nazw INNYCH artystów (gdy nie są szukanym artystą).\n" +
            "Odpowiedz WYŁĄCZNIE 5 cyframi oddzielonymi przecinkami, np: 3,7,1,12,5",
        },
        { role: "user", content: `Zapytanie: "${originalQuery}"${avoidNote}${colorNote}${artistBoostNote}\n\nKandydaci:\n${list}` },
      ],
    });

    const text = res.choices[0].message?.content?.trim() ?? "";
    // Odporny parser: wyciąga WSZYSTKIE liczby z odpowiedzi (obsługuje przecinki, spacje, newline)
    const indices = Array.from(text.matchAll(/\d+/g))
      .map((m) => parseInt(m[0]) - 1)
      .filter((i) => i >= 0 && i < candidates.length);

    const seen = new Set<number>();
    const result: number[] = [];
    for (const i of indices) {
      if (!seen.has(i)) { seen.add(i); result.push(i); }
      if (result.length === 5) break;
    }
    // Uzupełnij brakujące miejsca najlepszymi nieużytymi kandydatami
    for (let i = 0; i < candidates.length && result.length < 5; i++) {
      if (!seen.has(i)) { result.push(i); seen.add(i); }
    }
    return result.map((i) => candidates[i]);
  } catch {
    return candidates.slice(0, 5);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function inferAllowedTypes(query: string): string[] | null {
  const main = query.toLowerCase().trim();
  // Bass: includes() zamiast \b — "basowa"/"basowy"/"basową" mają końcówki które mylą \b
  if (main.includes("gitara basow") || main.includes("bass guitar") || main.includes("gitara basu") ||
      (main.includes("basow") && main.includes("gitar"))) return ["bass_guitar"];
  if (/\bklas(yczn[aąe]|yk)\b/.test(main) && /\bgitar/.test(main)) return ["classical_guitar"];
  if (/\bakustyczn[aąe]\b/.test(main) || (/\bgitar/.test(main) && /\bakustyczn/.test(main))) return ["acoustic_guitar", "classical_guitar"];
  if (/\belektryczn[aąe]\b/.test(main) && /\bgitar/.test(main)) return ["electric_guitar"];
  if (/\bgitar[aęyi]\b/.test(main)) return ["electric_guitar", "acoustic_guitar", "classical_guitar"];
  if (/\b(wzmacniacz|amplifier|wzmak)\b/.test(main)) return ["amp"];
  if (/\b(pedał|pedal|efekt|efekty|effect)\b/.test(main)) return ["pedal"];
  return null;
}

function scaleSimilarity(sim: number): number {
  return Math.min(100, Math.max(40, 40 + sim * 60));
}

function productText(item: any): string {
  return `${item.name ?? ""} ${(item.tags ?? []).join(" ")} ${item.description ?? ""}`.toLowerCase();
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const userId = await requireAuth(req.headers.get("Authorization"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { query, inspiration, minPrice, maxPrice } = await req.json();
    const rawQuery: string = typeof query === "string" ? query.trim() : "";
    const rawInspiration: string = typeof inspiration === "string" ? inspiration.trim() : "";

    if (!rawQuery && !rawInspiration) {
      return NextResponse.json({ error: "Brak zapytania użytkownika." }, { status: 400 });
    }

    const queryHash = crypto.createHash("sha256").update(`${rawQuery}|${rawInspiration}`).digest("hex");

    // === FAZA 1: analiza zapytania ===
    const analysis = await analyzeQuery(rawQuery, rawInspiration);

    // === FAZA 2: embedding + similarity search ===
    // Priorytety typów:
    // 1. Regex (explicit PL keywords) — najsilniejszy, bezpośrednia intencja usera
    // 2. GPT (wiedza encyklopedyczna) — fallback gdy brak PL keywordu ("stratocaster", "jazz bass")
    // 3. Domyślnie wykluczamy "other" (korpusy, części) — użytkownik prawie nigdy nie szuka części
    const MEANINGFUL_TYPES = ["electric_guitar", "acoustic_guitar", "classical_guitar", "bass_guitar", "amp", "pedal", "accessory"];
    const regexTypes = inferAllowedTypes(rawQuery);
    const allowedTypes = regexTypes ?? analysis.allowedTypes ?? MEANINGFUL_TYPES;

    const embedding = await getQueryEmbedding(analysis.semanticQuery);

    // Similarity search + text search po nazwie artysty — równolegle
    const [similarResults, signatureResults] = await Promise.all([
      findSimilarGear(embedding, {
        minPrice: minPrice ?? undefined,
        maxPrice: maxPrice ?? undefined,
        types: allowedTypes,
      }),
      (async () => {
        if (!rawInspiration.trim()) return [];
        let q = supabase
          .from("gear_items")
          .select("id, name, brand, type, tags, description, image_url, price, product_url, ai_profile")
          .ilike("name", `%${rawInspiration.trim()}%`)
          .eq("active", true)
          .in("type", allowedTypes);
        if (minPrice != null) q = q.gte("price", minPrice);
        if (maxPrice != null) q = q.lte("price", maxPrice);
        const { data } = await q.limit(10);
        return data ?? [];
      })(),
    ]);

    // Wstrzyknij sygnatury artysty do puli (jeśli nie ma ich w wynikach similarity)
    // similarity=0.95 → score ~97 po scaleSimilarity → zawsze w top-30 kandydatów
    const existingIds = new Set((similarResults ?? []).map((r: any) => r.id));
    const injectSigs = signatureResults
      .filter((sp: any) => !existingIds.has(sp.id))
      .map((sp: any) => ({ ...sp, similarity: 0.95 }));
    const rawResults = [...(similarResults ?? []), ...injectSigs];

    if (!rawResults || rawResults.length === 0) {
      return NextResponse.json({ results: [], ai_summary: null });
    }

    // === FAZA 3: budowanie puli kandydatów (typ już przefiltrowany przez DB) ===

    // 3a. Przeskalowanie similarity → 40–100%
    let pool: any[] = rawResults.map((item: any) => ({
      ...item,
      similarity_scaled: scaleSimilarity(item.similarity),
    }));

    // 3b. MIĘKKA reguła: penalizacja sygnatur innych artystów (−30%)
    // Zawsze stosowana — brak warunku fallback żeby nie pominąć penalizacji gdy pula pełna sygnatur
    if (analysis.artistsToAvoid.length > 0) {
      const avoidLower = analysis.artistsToAvoid.map((a) => a.toLowerCase());
      pool = pool.map((item) => {
        const nameLow = (item.name ?? "").toLowerCase();
        const isWrong = avoidLower.some((a) => nameLow.includes(a));
        return isWrong ? { ...item, similarity_scaled: item.similarity_scaled * 0.7 } : item;
      });
    }

    // 3c. BOOST: sygnatura szukanego artysty w nazwie produktu → awansuj na szczyt puli
    // Przykład: inspiracja="John Mayer" + produkt "PRS Silver Sky John Mayer" → score 92+
    if (rawInspiration.trim()) {
      const inspirLower = rawInspiration.trim().toLowerCase();
      pool = pool.map((item) => {
        const nameLow = (item.name ?? "").toLowerCase();
        if (nameLow.includes(inspirLower)) {
          return { ...item, similarity_scaled: Math.max(item.similarity_scaled, 92) };
        }
        return item;
      });
    }

    // 3d. Filtr koloru — TWARDE OGRANICZENIE
    // Gdy user podał kolor: reranker dostaje WYŁĄCZNIE produkty w tym kolorze.
    // Reranker nie może wybrać niekolorowych — ma tylko rankinować żółte/czerwone/etc. po jakości.
    // Gdy 0 trafień kolorowych → ignoruj kolor (baza nie ma, lepiej pokazać coś niż nic).
    if (analysis.colorKeywords.length > 0) {
      const colorMatches = pool.filter((item) =>
        analysis.colorKeywords.some((kw) => productText(item).includes(kw))
      );
      if (colorMatches.length >= 1) {
        pool = colorMatches;
      }
    }

    // Deduplikacja — usuń produkty o identycznej nazwie (różne warianty tego samego modelu zostają)
    const seenNames = new Set<string>();
    pool = pool.filter((item) => {
      const key = (item.name ?? "").toLowerCase().trim();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

    // Posortuj i weź top-30 jako pulę dla rerankera
    pool.sort((a, b) => b.similarity_scaled - a.similarity_scaled);
    const candidatePool = pool.slice(0, 30);

    if (process.env.NODE_ENV === "development") {
      console.log(`[recommend] query="${rawQuery}" | inspiration="${rawInspiration}"`);
      console.log(`[recommend] regexTypes=${JSON.stringify(regexTypes)} | gptTypes=${JSON.stringify(analysis.allowedTypes)} | effectiveTypes=${JSON.stringify(allowedTypes)}`);
      console.log(`[recommend] semanticQuery="${analysis.semanticQuery}"`);
      console.log(`[recommend] colorKeywords=${JSON.stringify(analysis.colorKeywords)}`);
      console.log(`[recommend] artistsToAvoid=${JSON.stringify(analysis.artistsToAvoid)}`);
      console.log(`[recommend] rawResults=${rawResults.length} (similar=${similarResults?.length ?? 0}, injectedSigs=${injectSigs.length}), candidatePool=${candidatePool.length}`);
      console.log(`[recommend] candidatePool (top 10):`, candidatePool.slice(0, 10).map((c: any) => `${c.name} [${c.type}]`));
      const boosted = candidatePool.filter((c: any) => c.similarity_scaled >= 92 && rawInspiration && (c.name ?? "").toLowerCase().includes(rawInspiration.trim().toLowerCase()));
      if (boosted.length > 0) console.log(`[recommend] artistBoost (${boosted.length}):`, boosted.map((c: any) => c.name));
    }

    // === FAZA 4: GPT Reranker (widzi prawdziwe nazwy, stosuje wiedzę o artystach) ===
    // Reranker dostaje pełne zapytanie (query + inspiracja) żeby rozumieć kontekst
    const fullQueryForReranker = rawInspiration
      ? `${rawQuery ? rawQuery + " | " : ""}inspiracja: ${rawInspiration}`
      : rawQuery;
    const top5 = await rerankWithGPT(fullQueryForReranker, candidatePool, analysis.artistsToAvoid, analysis.colorKeywords, rawInspiration);
    const productIds = top5.map((r: any) => r.id);

    // === FAZA 5: DB queries równolegle ===
    const [{ data: cached }, { data: priceHistoryRows }] = await Promise.all([
      supabase
        .from("ai_match_reasons")
        .select("product_id, reason")
        .eq("query_hash", queryHash)
        .in("product_id", productIds),
      supabase
        .from("gear_price_history")
        .select("gear_id, price, recorded_at")
        .in("gear_id", productIds)
        .order("recorded_at", { ascending: false }),
    ]);

    const cacheMap = new Map<string, string>();
    cached?.forEach((row) => cacheMap.set(row.product_id, row.reason));

    const missing = top5.filter((r: any) => !cacheMap.has(r.id));
    if (missing.length > 0) {
      await supabase.from("jobs").insert(
        missing.map((item: any) => ({
          type: "generate_reasoning",
          query: fullQueryForReranker,
          query_hash: queryHash,
          product_id: item.id,
          created_at: new Date().toISOString(),
        }))
      );
    }

    const latestPriceMap = new Map<string, { price: number; recorded_at: string }>();
    if (priceHistoryRows) {
      for (const row of priceHistoryRows) {
        if (!latestPriceMap.has(row.gear_id))
          latestPriceMap.set(row.gear_id, { price: row.price, recorded_at: row.recorded_at });
      }
    }

    const enriched = top5.map((item: any) => ({
      ...item,
      ai_reason: cacheMap.get(item.id) ?? null,
      latest_scraped_price: latestPriceMap.get(item.id) ?? null,
    }));

    return NextResponse.json({
      query,
      queryHash,
      filters: { minPrice: minPrice ?? null, maxPrice: maxPrice ?? null },
      results: enriched,
    });
  } catch (err: any) {
    const msg: string = err?.message ?? (typeof err === "string" ? err : JSON.stringify(err));
    console.error("Error in /api/recommend:", msg, err);
    return NextResponse.json(
      { error: msg, results: [] },
      { status: 500 }
    );
  }
}
