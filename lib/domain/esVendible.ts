import type { Producto } from "./types";

/**
 * La regla más importante del dominio (`nacer-dominio` §2): disponibilidad
 * manda sobre stock. `Bajo pedido` se vende sin importar el stock; solo
 * `Disponible` depende de `stock > 0`. Nunca escribir `if (stock > 0)` como
 * condición de compra en ningún componente — siempre pasar por esta función.
 */
export function esVendible(producto: Producto): boolean {
  if (!producto.activo) return false;
  if (producto.disponibilidad === "Agotado") return false;
  if (producto.disponibilidad === "Bajo pedido") return true;
  return producto.stock > 0;
}
