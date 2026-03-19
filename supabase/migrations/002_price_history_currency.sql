-- Dodaje kolumnę currency do gear_price_history
-- Domyślnie PLN (wszystkie istniejące wpisy są w złotówkach)

ALTER TABLE gear_price_history
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'PLN';
