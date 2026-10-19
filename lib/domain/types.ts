/**
 * Tipos de dominio del storefront de Crisálidas y Mariposas.
 *
 * Vocabulario en español porque así vive en `nacer-dominio`: `disponibilidad`,
 * `precio_cop`, etc. no se traducen. El código que los consume (componentes,
 * hooks) sí está en inglés.
 *
 * La forma sale de lo que la base de datos realmente tiene (`products`,
 * `product_variants`, `product_options`, `v_variant_availability`). Lo que la DB
 * no modela —ocasiones, agenda, pieza única, tiempo de preparación, descripción
 * corta/larga— no aparece aquí: se agrega cuando exista el dato, no antes.
 *
 * Este es el contrato que cruza a componentes de cliente, así que NO lleva
 * stock, unidades exactas ni costos: solo lo que la ficha necesita mostrar.
 */

export type Disponibilidad = "Disponible" | "Bajo pedido" | "Agotado";

export interface ImagenProducto {
  url: string;
  alt: string;
}

export interface VarianteProducto {
  id: string;
  sku: string;
  /** Texto para el selector, derivado de `attributes` (p. ej. "Azul", "50 mariposas"). */
  etiqueta: string;
  /** Precio final de la variante: `base_price + price_delta`, en COP enteros. */
  precioCop: number;
  /** Hay al menos una unidad vendible según `v_variant_availability`. */
  vendible: boolean;
  imagenUrl: string | null;
}

export interface AdicionalProducto {
  id: string;
  nombre: string;
  precioCop: number;
  maxCantidad: number;
}

export interface Producto {
  id: string;
  sku: string;
  slug: string;
  nombre: string;
  /** Colección de Crisálidas, o "Complementos" para esa línea. */
  coleccion: string;
  coleccionSlug: string;
  descripcion: string | null;
  simbolismo: string | null;
  /** Precio de la variante más barata. Ver `tienePreciosVariables`. */
  precioDesdeCop: number;
  tienePreciosVariables: boolean;
  disponibilidad: Disponibilidad;
  variantes: VarianteProducto[];
  adicionales: AdicionalProducto[];
  /** Galería ordenada; vacía si el producto no tiene imágenes. */
  imagenes: ImagenProducto[];
  /** ISO; solo para ordenar destacados. */
  creadoEn: string;
}

export interface ColeccionFiltro {
  slug: string;
  nombre: string;
}
