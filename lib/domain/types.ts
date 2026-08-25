/**
 * Tipos de dominio para el storefront de Crisálidas y Mariposas.
 *
 * Vocabulario en español porque así vive en `nacer-dominio`: `disponibilidad`,
 * `precio_cop`, `ocasion`, etc. no se traducen. El código que los consume
 * (componentes, hooks) sí está en inglés.
 *
 * Fase 1: no hay Supabase. Estos tipos son el contrato que el mock de
 * `lib/data/products.ts` respeta, y el mismo que usará la tabla `productos`
 * cuando se conecte el backend real.
 */

export type Categoria = "Experiencia" | "Artesanía" | "Detalle";

export type Disponibilidad = "Disponible" | "Bajo pedido" | "Agotado";

/**
 * Vocabulario cerrado de ocasiones (`nacer-dominio` §6). No agregar valores
 * sueltos: es la dimensión principal de filtro del catálogo, por encima de
 * categoría, y su valor viene de una tabla `ocasiones` compartida por marca.
 */
export type Ocasion =
  | "celebración"
  | "homenaje"
  | "regalo"
  | "familia"
  | "acompañar"
  | "recordar"
  | "condolencias"
  | "conservación"
  | "educación"
  | "naturaleza"
  | "experiencia"
  | "decoración"
  | "agradecer"
  | "celebrar"
  | "empresas";

/** Ocasiones que fuerzan el registro sobrio de animación en toda la UI. */
export const OCASIONES_SOBRIAS: readonly Ocasion[] = [
  "condolencias",
  "acompañar",
  "recordar",
];

export function esOcasionSobria(ocasiones: Ocasion[]): boolean {
  return ocasiones.some((o) => OCASIONES_SOBRIAS.includes(o));
}

export interface ImagenProducto {
  url: string;
  alt: string;
}

export interface Producto {
  id: string;
  sku: string;
  slug: string;
  nombre: string;
  categoria: Categoria;
  descripcionCorta: string;
  descripcionLarga: string;
  precioCop: number;
  disponibilidad: Disponibilidad;
  stock: number;
  tiempoPreparacionDias?: number;
  requiereAgenda: boolean;
  esPiezaUnica: boolean;
  activo: boolean;
  ocasiones: Ocasion[];
  /** Galería ordenada; la primera imagen es la portada del producto. */
  imagenes: ImagenProducto[];
}
