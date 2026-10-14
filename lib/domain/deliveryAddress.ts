/**
 * Dirección de entrega para las tarjetas (Despachos, Perdidos). Pura, sin
 * dependencias, para que `node --test` la cargue.
 */

/** Lo que la función lee de `sale_details`. */
export interface DeliveryAddressSale {
  submitted_at: string | null;
  delivery_address_exact: string | null;
  delivery_unit: string | null;
  building_name: string | null;
  neighborhood: string | null;
  city: string | null;
}

/** Recorta y trata el texto en blanco como ausente. */
function present(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function join(parts: (string | null)[]): string | null {
  const kept = parts.filter((part): part is string => part !== null);
  return kept.length > 0 ? kept.join(", ") : null;
}

/**
 * Arma la dirección en este orden de preferencia:
 * 1. Dirección exacta del formulario + unidad, edificio, barrio y ciudad.
 * 2. `orders.delivery_address` (la que dio el asistente, que ya trae barrio y
 *    ciudad) + unidad y edificio del formulario si existen.
 * 3. Unidad, edificio, barrio y ciudad del formulario.
 * 4. `fallback`.
 * Los datos de `sale_details` solo cuentan si el formulario se envió: una fila
 * sin `submitted_at` es un borrador.
 */
export function formatDeliveryAddress(
  orderAddress: string | null | undefined,
  saleDetails: DeliveryAddressSale | null | undefined,
  fallback: string,
): string {
  const sale = saleDetails?.submitted_at ? saleDetails : null;
  const exact = present(sale?.delivery_address_exact);
  const unit = present(sale?.delivery_unit);
  const building = present(sale?.building_name);
  const neighborhood = present(sale?.neighborhood);
  const city = present(sale?.city);
  const fromOrder = present(orderAddress);

  if (exact !== null) return join([exact, unit, building, neighborhood, city]) ?? fallback;
  if (fromOrder !== null) return join([fromOrder, unit, building]) ?? fallback;
  return join([unit, building, neighborhood, city]) ?? fallback;
}
