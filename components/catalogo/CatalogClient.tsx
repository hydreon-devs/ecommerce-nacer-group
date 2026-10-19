"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { filterByPrice, priceBounds, type PriceRange } from "@/lib/domain/priceRange";
import type { ColeccionFiltro, Producto } from "@/lib/domain/types";
import { ColeccionChips } from "./ColeccionChips";
import { PriceRangeFilter } from "./PriceRangeFilter";
import { ProductCard } from "./ProductCard";

interface CatalogClientProps {
  productos: Producto[];
  colecciones: ColeccionFiltro[];
  initialColeccion?: string | null;
}

/** Tarjetas de la primera fila(s) que cargan eager: candidatas a LCP. */
const PRIORITY_CARDS = 2;

/**
 * Filtro de catálogo por colección. `AnimatePresence` + `layout`, keyed por
 * `producto.id` (estable entre renders), reordena la grilla sin remontar las
 * tarjetas que permanecen visibles.
 *
 * `initial={false}`: las tarjetas del primer render ya vienen pintadas desde el
 * servidor; solo las que entran al cambiar el filtro animan. Así el HTML inicial
 * no sale con `opacity: 0` (LCP) y no hay parpadeo al hidratar.
 *
 * Precio: los extremos de la barra salen de la colección activa, y al cambiar
 * de colección el rango vuelve a cubrirla completa (`range = null`).
 */
export function CatalogClient({
  productos,
  colecciones,
  initialColeccion = null,
}: CatalogClientProps) {
  const [selected, setSelected] = useState<string | null>(initialColeccion);
  // `null` = sin acotar: todo el rango de la colección activa.
  const [range, setRange] = useState<PriceRange | null>(null);

  const inCollection = useMemo(() => {
    if (!selected) return productos;
    return productos.filter((p) => p.coleccionSlug === selected);
  }, [productos, selected]);

  const bounds = useMemo(() => priceBounds(inCollection), [inCollection]);
  const filtered = useMemo(() => filterByPrice(inCollection, range), [inCollection, range]);

  function selectCollection(slug: string | null) {
    setSelected(slug);
    setRange(null);
  }

  // Desde `lg` el filtro pasa a una columna lateral `sticky` que acompaña el
  // scroll de la grilla; `self-start` es lo que deja al `aside` pegarse en vez
  // de estirarse al alto de la fila. `top-28` libera el header fijo.
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
      <aside className="lg:sticky lg:top-28 lg:w-56 lg:shrink-0 lg:self-start">
        <p className="mb-3 hidden font-body text-xs uppercase tracking-wide text-ink-muted lg:block">
          Colecciones
        </p>
        <ColeccionChips colecciones={colecciones} selected={selected} onSelect={selectCollection} />
        {bounds && (
          <div className="mt-6 max-w-sm lg:mt-8">
            <PriceRangeFilter bounds={bounds} value={range ?? bounds} onChange={setRange} />
          </div>
        )}
      </aside>

      <div className="flex-1">
        {/* Región `status` (polite, atómica): anuncia cuántas piezas quedan al
            filtrar sin mover el foco. Siempre en el DOM para que el cambio se lea. */}
        <p
          role="status"
          aria-atomic="true"
          className="mb-4 font-body text-sm text-ink-muted"
        >
          {filtered.length === 1 ? "1 pieza" : `${filtered.length} piezas`}
        </p>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-2xl bg-cream-soft/60 p-6">
            <p className="font-body text-ink-muted">
              {inCollection.length > 0
                ? "No hay piezas en este rango de precio."
                : "No hay piezas en esta colección todavía."}
            </p>
            <button
              type="button"
              onClick={() => selectCollection(null)}
              className="inline-flex min-h-11 items-center rounded-full bg-moss px-5 font-body text-sm text-cream transition-[background-color,scale] duration-150 ease-out hover:bg-moss-deep enabled:active:scale-[0.96] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
            >
              Ver todas las piezas
            </button>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-6 xl:grid-cols-3"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {filtered.map((producto, index) => (
                <ProductCard
                  key={producto.id}
                  producto={producto}
                  animated
                  priority={index < PRIORITY_CARDS}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
