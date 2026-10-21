"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Producto } from "@/lib/domain/types";
import { formatCop } from "@/lib/format";
import { cardHover, DURATION_UI, DURATION_UI_FAST, EASE_UI } from "@/components/motion/variants";
import { DisponibilidadBadge } from "./DisponibilidadBadge";
import { ImagePlaceholder } from "./ImagePlaceholder";
import { QuickAdd } from "./QuickAdd";

interface ProductCardProps {
  producto: Producto;
  /**
   * La tarjeta forma parte de la grilla filtrable: entra/sale con
   * `AnimatePresence` y se reordena con `layout`. Fuera de ella (relacionados,
   * carrusel del Home) se renderiza estática: sin `opacity: 0` inicial en el
   * HTML del servidor, que retrasaría el LCP y ocultaría la tarjeta sin JS.
   */
  animated?: boolean;
  /** Imagen candidata a LCP: carga eager y con prioridad alta. */
  priority?: boolean;
}

/**
 * Tarjeta de catálogo. `layout` + `key` estable (`producto.id`, provisto por
 * el padre) permiten que `AnimatePresence` reordene sin remount al filtrar
 * por colección.
 *
 * Superficie: la tarjeta tiene `p-2` (el enlace usa `m-2` y la fila de acción `px-2 pb-2`) y la
 * imagen `rounded-xl` (12px), así que
 * el radio exterior es 12 + 8 = 20px (concentric radii). El contorno es una
 * sombra en capas, no un borde; el `border` transparente es para forced-colors.
 *
 * Registro de movimiento: hoy todo el catálogo usa el registro por defecto
 * porque la DB no tiene ocasiones. Cuando existan, las tarjetas de
 * `condolencias`/`acompañar`/`recordar` vuelven al registro sobrio (sin escala
 * ni desplazamiento en hover, solo color de borde).
 */
export function ProductCard({ producto, animated = false, priority = false }: ProductCardProps) {
  const portada = producto.imagenes[0];

  return (
    <motion.div
      layout={animated}
      initial={animated ? { opacity: 0, scale: 0.96 } : false}
      animate={{ opacity: 1, scale: 1 }}
      exit={animated ? { opacity: 0, transition: { duration: DURATION_UI_FAST, ease: "easeOut" } } : undefined}
      transition={{ duration: DURATION_UI, ease: EASE_UI }}
      className="h-full"
    >
      <motion.article
        initial="rest"
        whileHover="hover"
        variants={cardHover}
        className="flex h-full flex-col rounded-[20px] border border-transparent bg-cream-soft/40 shadow-card transition-shadow duration-200 ease-out hover:shadow-card-hover motion-reduce:transition-none"
      >
        <Link
          href={`/catalogo/${producto.slug}`}
          className="m-2 mb-0 flex flex-1 flex-col rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
        >
          {/* Vertical y `object-contain`: las fotos reales son piezas altas sobre
              fondo blanco; con `object-cover` en 4:3 se cortaban por arriba.
              El contorno `outline-black/10` define el borde de la foto blanca
              sobre el fondo crema sin alterar su tamaño. */}
          <div
            data-cart-source="card"
            className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-white"
          >
            {portada ? (
              <Image
                src={portada.url}
                alt={portada.alt}
                fill
                sizes="(max-width: 1279px) 50vw, 33vw"
                loading={priority ? "eager" : undefined}
                fetchPriority={priority ? "high" : undefined}
                className="rounded-xl object-contain p-4 outline outline-1 -outline-offset-1 outline-black/10 sm:p-6"
              />
            ) : (
              <ImagePlaceholder label={producto.nombre} />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1.5 px-2 pt-3 pb-2 sm:px-3 sm:pb-3">
            <p className="font-body text-xs uppercase tracking-wide text-ink-muted">
              {producto.coleccion}
            </p>
            <h3 className="font-display text-base leading-tight text-ink sm:text-xl">
              {producto.nombre}
            </h3>
            {producto.descripcion && (
              <p className="hidden font-body text-sm text-ink-muted line-clamp-2 sm:block">
                {producto.descripcion}
              </p>
            )}
            <div className="mt-auto flex flex-col items-start gap-2 pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-2">
              <span className="font-display text-lg text-ink">
                {producto.tienePreciosVariables && (
                  <span className="mr-1 font-body text-xs text-ink-muted">Desde</span>
                )}
                {formatCop(producto.precioDesdeCop)}
              </span>
              <DisponibilidadBadge disponibilidad={producto.disponibilidad} />
            </div>
          </div>
        </Link>
        {/* Fuera del enlace: un botón dentro de `<a>` es HTML inválido y
            navegaría al pulsarlo. Sigue dentro de la tarjeta, bajo el `p-2`. */}
        <div className="px-2 pb-2">
          <QuickAdd producto={producto} />
        </div>
      </motion.article>
    </motion.div>
  );
}
