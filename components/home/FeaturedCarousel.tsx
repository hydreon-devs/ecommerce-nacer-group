"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ProductCard } from "@/components/catalogo/ProductCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { Producto } from "@/lib/domain/types";

interface FeaturedCarouselProps {
  productos: Producto[];
}

/**
 * Carrusel de destacados del Home. Sin librería de carrusel: es un contenedor
 * con `overflow-x` y `scroll-snap` nativo, y los botones solo llaman a
 * `scrollBy`. El gesto táctil y la rueda horizontal funcionan sin JavaScript;
 * los botones son una ayuda para puntero, no el único camino.
 *
 * Las tarjetas son `ProductCard`, el mismo componente del catálogo: reutiliza
 * `DisponibilidadBadge`, `formatCop` y el registro sobrio para ocasiones de
 * duelo. Duplicar esa lógica aquí sería la forma más fácil de que un `Bajo
 * pedido` terminara pintado como agotado en el Home y no en el catálogo.
 *
 * Muestra un número EXACTO de tarjetas por vista: una en móvil, tres desde
 * `md`. Las tarjetas no tienen ancho fijo — se reparten el ancho de contenido
 * del contenedor — así que ninguna queda cortada contra el margen.
 *
 * Eso tiene un costo que hay que compensar: la versión anterior dejaba la fila
 * cortada a propósito, y ese recorte era la única pista de que había más
 * productos. Sin él, los controles dejan de ser una ayuda para puntero y pasan
 * a ser la señal de que el carrusel se mueve — por eso ahora se ven también en
 * móvil, donde antes estaban ocultos.
 */
export function FeaturedCarousel({ productos }: FeaturedCarouselProps) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const syncEdges = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    setCanPrev(scrollLeft > 4);
    setCanNext(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    syncEdges();
    scroller.addEventListener("scroll", syncEdges, { passive: true });
    const ro = new ResizeObserver(syncEdges);
    ro.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", syncEdges);
      ro.disconnect();
    };
  }, [syncEdges]);

  /**
   * Avanza una página completa: tantas tarjetas como quepan, no una sola. Si se
   * ven tres, el botón pasa a las tres siguientes.
   *
   * Cuántas caben NO se deriva del breakpoint sino de la geometría real. Repetir
   * aquí el `md:` de las clases sería una segunda fuente de verdad, y se
   * desincronizaría en cuanto alguien tocara el ancho de tarjeta o el gap.
   */
  function scrollPage(direction: 1 | -1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const behavior = prefersReducedMotion ? "auto" : "smooth";
    const items = scroller.children;

    if (items.length < 2) {
      scroller.scrollBy({ left: direction * scroller.clientWidth, behavior });
      return;
    }

    // El paso se mide entre dos tarjetas reales en vez de asumir un ancho:
    // el ancho cambia por breakpoint y el gap vive solo en las clases.
    const pitch =
      (items[1] as HTMLElement).offsetLeft -
      (items[0] as HTMLElement).offsetLeft;

    // `clientWidth` incluye el padding lateral del scroller; el ancho que
    // reparten las tarjetas es el de contenido, que es contra el que resuelven
    // sus porcentajes.
    const style = getComputedStyle(scroller);
    const contentWidth =
      scroller.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);

    const perView = Math.max(1, Math.round(contentWidth / pitch));

    scroller.scrollBy({ left: direction * perView * pitch, behavior });
  }

  if (productos.length === 0) return null;

  return (
    <section className="border-b border-ink/8 bg-cream-soft/45 py-20 md:py-28">
      <div className="flex flex-col gap-6 px-6 md:flex-row md:items-end md:justify-between md:px-16">
        <div className="max-w-xl">
          <SectionLabel>Destacados</SectionLabel>
          <h2 className="font-display mt-3 text-3xl leading-tight text-ink md:text-5xl">
            Una selección para empezar
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/catalogo"
            className="font-body text-sm font-medium text-moss transition-colors duration-200 hover:text-ink"
          >
            Ver todo el catálogo →
          </Link>

          <div className="flex items-center gap-2">
            <CarouselButton
              direction="prev"
              disabled={!canPrev}
              onClick={() => scrollPage(-1)}
            />
            <CarouselButton
              direction="next"
              disabled={!canNext}
              onClick={() => scrollPage(1)}
            />
          </div>
        </div>
      </div>

      <ul
        ref={scrollerRef}
        className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-6 px-6 pb-2 md:mt-14 md:scroll-px-16 md:px-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* El porcentaje resuelve contra la caja de contenido del scroller, o
            sea el ancho entre los paddings — justo el hueco visible. Con tres
            tarjetas a la vista quedan DOS gaps dentro de ese hueco: de ahí el
            2.5rem, que son los dos `gap-5` de arriba. Si cambia el gap, cambia
            este número. */}
        {productos.map((producto) => (
          <li
            key={producto.id}
            className="w-full shrink-0 snap-start md:w-[calc((100%_-_2.5rem)/3)]"
          >
            <ProductCard producto={producto} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CarouselButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Anterior" : "Siguiente"}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 text-ink/70 transition-colors duration-200 hover:border-moss hover:text-moss disabled:cursor-default disabled:border-ink/8 disabled:text-ink/25 disabled:hover:border-ink/8 disabled:hover:text-ink/25"
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-4 w-4 ${direction === "prev" ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  );
}
