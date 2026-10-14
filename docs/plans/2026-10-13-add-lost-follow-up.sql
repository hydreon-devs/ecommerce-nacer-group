-- Migración: add_lost_follow_up_to_orders
-- Estado: aplicada el 2026-10-13 (proyecto pbjwbozxpzqqtheatxsi).

-- Seguimiento de un pedido perdido: cuándo se perdió y cómo se resolvió.
-- Todo nulo por defecto: el asistente de WhatsApp también escribe la fase
-- 'perdido' y no envía estos datos.
alter table public.orders
  add column lost_at timestamptz,
  add column lost_resolution text
    constraint orders_lost_resolution_check
    check (lost_resolution in ('repuesto', 'reembolsado', 'cerrado_sin_accion')),
  add column lost_resolution_note text
    constraint orders_lost_resolution_note_length_check
    check (char_length(lost_resolution_note) between 1 and 500),
  add column lost_resolved_at timestamptz;

-- La resolución y su fecha van juntas; una nota solo existe con resolución.
alter table public.orders
  add constraint orders_lost_resolution_pair_check
    check ((lost_resolution is null) = (lost_resolved_at is null)),
  add constraint orders_lost_resolution_note_requires_resolution_check
    check (lost_resolution_note is null or lost_resolution is not null);

comment on column public.orders.lost_at is
  'Cuándo se marcó el pedido como perdido desde el panel. NULL = no registrado.';
comment on column public.orders.lost_resolution is
  'Cómo se resolvió el pedido perdido. Solo registro: no reembolsa ni crea pedidos. NULL = por resolver.';
comment on column public.orders.lost_resolution_note is
  'Nota opcional de la resolución.';
comment on column public.orders.lost_resolved_at is
  'Cuándo se registró la resolución.';

-- Carga inicial: los perdidos existentes toman su última actualización.
update public.orders
set lost_at = updated_at
where status = 'pagado'
  and fulfillment_status = 'perdido'
  and lost_at is null;
