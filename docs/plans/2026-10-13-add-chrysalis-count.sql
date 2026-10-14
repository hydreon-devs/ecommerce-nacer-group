-- Migración: add_chrysalis_count_to_product_variants
-- Estado: aplicada el 2026-10-13 desde el editor SQL de Supabase (proyecto pbjwbozxpzqqtheatxsi).

-- Crisálidas que lleva una unidad de la variante. NULL = sin definir.
alter table public.product_variants
  add column chrysalis_count integer
  constraint product_variants_chrysalis_count_check check (chrysalis_count >= 0);

comment on column public.product_variants.chrysalis_count is
  'Crisálidas que lleva una unidad de la variante. NULL = sin definir; 0 = no lleva.';

-- Carga inicial: el número con el que empieza products.description
-- ("2 crisalidas de mariposa, ..."). Lo que no empieza así no lleva crisálidas.
update public.product_variants v
set chrysalis_count = coalesce(
  (substring(p.description from '^\s*(\d+)\s+cris[aá]lidas?'))::integer,
  0
)
from public.products p
where p.id = v.product_id;
