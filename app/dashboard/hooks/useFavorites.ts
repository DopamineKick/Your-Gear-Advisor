"use client";

import { useState, useEffect, useCallback } from "react";

export interface FavoriteItem {
  id: string;
  name: string;
  description?: string;
  ai_reason?: string;
  matchPercent?: number;
  price?: number | null;
  latest_scraped_price?: { price: number } | null;
  image_url?: string;
  product_url?: string;
}

const STORAGE_KEY = "yga_favorites";

function loadFromStorage(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: FavoriteItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("yga-local-update"));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    setFavorites(loadFromStorage());
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.some((f) => f.id === id),
    [favorites]
  );

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === item.id);
      const next = exists ? prev.filter((f) => f.id !== item.id) : [...prev, item];
      saveToStorage(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite, removeFavorite };
}
