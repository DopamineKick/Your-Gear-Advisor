"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "configurator_items";

export function useConfigurator() {
  const [items, setItems] = useState<any[]>([]);
  const [lastRemoved, setLastRemoved] = useState<any | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, []);

  function persist(next: any[]) {
    setItems(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("yga-local-update")); } catch {}
  }

  function addToConfigurator(item: any) {
    setItems(prev => {
      const key = item.id ?? item.name;
      if (prev.some(i => (i.id ?? i.name) === key)) return prev;
      const next = [...prev, item];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("yga-local-update")); } catch {}
      return next;
    });
  }

  function removeFromConfigurator(idOrName: string) {
    setItems(prev => {
      const removed = prev.find(i => (i.id ?? i.name) === idOrName);
      if (removed) setLastRemoved(removed);
      const next = prev.filter(i => (i.id ?? i.name) !== idOrName);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("yga-local-update")); } catch {}
      return next;
    });
  }

  function restoreLastRemoved() {
    if (!lastRemoved) return;
    addToConfigurator(lastRemoved);
    setLastRemoved(null);
  }

  function isInConfigurator(idOrName: string) {
    return items.some(i => (i.id ?? i.name) === idOrName);
  }

  return { items, lastRemoved, addToConfigurator, removeFromConfigurator, restoreLastRemoved, isInConfigurator };
}
