-- Migración: add_lost_reason_to_orders
-- Estado: aplicada el 2026-10-13 (proyecto pbjwbozxpzqqtheatxsi).

-- Qué pasó con un pedido marcado como perdido desde Despachos. NULL = sin motivo.
-- Sin restricción contra fulfillment_status: el asistente de WhatsApp también
-- escribe 'perdido' y no envía motivo; el panel es quien lo exige.
alter table public.orders
  add column lost_reason text
  constraint orders_lost_reason_length_check check (char_length(lost_reason) between 1 and 500);

comment on column public.orders.lost_reason is
  'Motivo registrado al marcar el pedido como perdido desde el panel. NULL = sin motivo.';
