import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

async function fetchAllWithoutEmbedding(): Promise<any[]> {
  const PAGE = 500;
  const all: any[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("gear_items")
      .select("*")
      .is("embedding", null)
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function run() {
  // 1. Pobierz wszystkie rekordy bez embeddingu (z paginacją)
  let items: any[];
  try {
    items = await fetchAllWithoutEmbedding();
  } catch (error) {
    console.error("Error loading items:", error);
    return;
  }

  if (!items || items.length === 0) {
    console.log("No items found that need embeddings.");
    return;
  }

  console.log(`Generating embeddings for ${items.length} items...`);

  for (const item of items) {
    // ZBUDUJ TEKST Z TEGO, CO JEST
    const parts: string[] = [];

    if (item.name) parts.push(item.name);
    if (item.brand) parts.push(`Brand: ${item.brand}`);
    if (item.type) parts.push(`Type: ${item.type}`);
    if (item.tags && item.tags.length > 0) {
      parts.push(`Tags: ${item.tags.join(", ")}`);
    }
    if (item.description) parts.push(`Description: ${item.description}`);

    const text = parts.length > 0 ? parts.join("\n") : (item.name ?? "");

    if (!text || text.trim() === "") {
      console.warn(`Skipping item ${item.id} – empty text for embedding.`);
      continue;
    }

    try {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      const embedding = embeddingResponse.data[0].embedding;

      const { error: updateError } = await supabase
        .from("gear_items")
        .update({
          embedding,
          product_url: item.product_url ?? null, // 🔵 DODANE
        })
        .eq("id", item.id);

      if (updateError) {
        console.error(`Failed to update embedding for ${item.name}:`, updateError);
      } else {
        console.log(`Updated embedding for ${item.name}`);
      }
    } catch (err) {
      console.error(`Embedding failed for ${item.name}:`, err);
    }
  }

  console.log("Done.");
}

run();
