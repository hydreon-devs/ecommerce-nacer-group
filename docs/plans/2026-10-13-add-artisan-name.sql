-- Migración: add_artisan_name_to_orders
-- Estado: aplicada el 2026-10-13 desde el editor SQL de Supabase (proyecto pbjwbozxpzqqtheatxsi).

-- Quién arma el pedido. Texto libre, igual que advisor_name y supplier_name (ADR 0005).
alter table public.orders
  add column artisan_name text;

comment on column public.orders.artisan_name is
  'Artesano que arma el pedido. Texto libre; lo registra la artesana en Producción.';

comment on column public.orders.supplier_name is
  'Proveedor de las mariposas del pedido (no quien lo arma: eso es artisan_name). Texto libre.';
