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
 * Va de borde a borde a propósito: la fila se corta contra el margen derecho
 * en vez de terminar en un contenedor centrado, que es lo que hace evidente
 * que hay más productos.
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

  function scrollByCard(direction: 1 | -1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    // El paso se mide entre dos tarjetas reales en vez de asumir un ancho:
    // el ancho cambia por breakpoint y el gap vive solo en las clases.
    const items = scroller.children;
    const step =
      items.length >= 2
        ? (items[1] as HTMLElement).offsetLeft -
          (items[0] as HTMLElement).offsetLeft
        : scroller.clientWidth;
    scroller.scrollBy({
      left: direction * step,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
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

          <div className="hidden items-center gap-2 sm:flex">
            <CarouselButton
              direction="prev"
              disabled={!canPrev}
              onClick={() => scrollByCard(-1)}
            />
            <CarouselButton
              direction="next"
              disabled={!canNext}
              onClick={() => scrollByCard(1)}
            />
          </div>
        </div>
      </div>

      <ul
        ref={scrollerRef}
        className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-6 px-6 pb-2 md:mt-14 md:scroll-px-16 md:px-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {productos.map((producto) => (
          <li
            key={producto.id}
            className="w-[78vw] max-w-[20rem] shrink-0 snap-start sm:w-[19rem] lg:w-[21rem]"
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
