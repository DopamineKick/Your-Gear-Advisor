"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useRecommendations(
  query: string,
  options?: { minPrice?: number; maxPrice?: number; inspiration?: string }
) {
  const [data, setData] = useState<any[]>([]);
  const [queryHash, setQueryHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inspiration = options?.inspiration ?? "";

  // -----------------------------
  // 1) Pierwsze pobranie wyników
  // -----------------------------
  useEffect(() => {
    if (!query.trim() && !inspiration.trim()) return;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            query,
            inspiration: inspiration || undefined,
            minPrice: options?.minPrice ?? undefined,
            maxPrice: options?.maxPrice ?? undefined,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson?.error || `Server error ${res.status}`);
        }

        const json = await res.json();
        const raw = json.results || [];
        setQueryHash(json.queryHash ?? null);

        // Serwer już obliczył similarity_scaled i uszeregował przez GPT reranker.
        // Używamy jego wartości bezpośrednio — nie re-rankujemy po stronie klienta.
        const scored = raw.map((item: any) => ({
          ...item,
          matchPercent: Math.round(item.similarity_scaled ?? 50),
        }));

        setData(scored);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [query, inspiration, options?.minPrice, options?.maxPrice]);

  // -----------------------------
  // 2) Polling AI reasoning (LEKKI)
  // -----------------------------
  useEffect(() => {
    if (!queryHash) return;
    if (data.length === 0) return;

    const interval = setInterval(async () => {
      // Jeśli wszystkie produkty mają reasoning → stop
      if (!data.some((item) => !item.ai_reason)) return;

      const productIds = data.map((d) => d.id);

      const res = await fetch("/api/reasoning/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queryHash, productIds }),
      });

      const json = await res.json();
      const results = json.results || [];

      if (results.length === 0) return;

      // Wstrzykujemy reasoning do istniejących elementów
      setData((prev) =>
        prev.map((item) => {
          const found = results.find((r: any) => r.product_id === item.id);
          if (found) {
            return { ...item, ai_reason: found.reason };
          }
          return item;
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [queryHash, data]);

  return { data, loading, error };
}
