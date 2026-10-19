import type { Producto } from "./types";

/**
 * La regla más importante del dominio (`nacer-dominio` §2): disponibilidad
 * manda sobre stock. Aquí ni siquiera llega el stock: `disponibilidad` ya se
 * resolvió en `mapStorefrontProducts` a partir de `v_variant_availability`
 * (nunca `stock_qty - reserved_qty`). `Bajo pedido` se vende siempre; solo
 * `Agotado` bloquea. Nunca escribir una condición de compra sobre stock en un
 * componente — siempre pasar por esta función.
 *
 * El filtro `is_published` / marca que vende ya se aplicó al cargar el catálogo.
 */
export function esVendible(producto: Pick<Producto, "disponibilidad">): boolean {
  return producto.disponibilidad !== "Agotado";
}
