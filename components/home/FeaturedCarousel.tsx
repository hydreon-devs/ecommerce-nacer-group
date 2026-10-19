"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ProductCard } from "@/components/catalogo/ProductCard";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
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
 * `DisponibilidadBadge` y `formatCop`. Duplicar esa lógica aquí sería la forma
 * más fácil de que el Home y el catálogo muestren la disponibilidad distinto.
 *
 * Tres tarjetas exactas por vista desde `md`, que se reparten el ancho de
 * contenido. En móvil cada tarjeta mide 85%: la siguiente asoma un pedazo y esa
 * es la pista de que hay más (el scroll-snap alinea la tarjeta activa al
 * margen). Los botones se ven también en móvil como segunda señal.
 *
 * Recorte de sombras: un contenedor con `overflow-x` no visible obliga a
 * `overflow-y` a computarse como `auto`, así que todo lo que sobresale de su
 * caja de relleno se corta — incluida la sombra de la tarjeta y su elevación en
 * hover (`y: -4`, `scale: 1.02`, `shadow-card-hover`). Por eso el scroller
 * lleva relleno vertical (`py-8`, más que lo que sobresale la sombra, ~24px) y
 * un margen negativo que devuelve el espaciado original al layout.
 *
 * No hay indicador de posición ("1 / n"): el paso se mide por geometría y con
 * una tarjeta asomando la "página" actual es ambigua; los botones deshabilitados
 * en los extremos ya dicen dónde está el inicio y el fin.
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
    <section
      aria-labelledby="destacados-title"
      className="border-b border-ink/8 bg-cream-soft/45 py-20 md:py-28"
    >
      <div className="flex flex-col gap-6 px-6 md:flex-row md:items-end md:justify-between md:px-16">
        <div className="max-w-xl">
          <SectionLabel>Destacados</SectionLabel>
          <h2
            id="destacados-title"
            className="font-display mt-3 text-3xl leading-tight text-ink md:text-5xl"
          >
            Una selección para empezar
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/catalogo"
            className="inline-flex min-h-11 items-center gap-1 rounded-full font-body text-sm font-medium text-moss-deep transition-colors duration-200 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          >
            Ver todo el catálogo
            <ChevronRightIcon width={16} height={16} />
          </Link>

          <div className="flex items-center gap-2">
            <CarouselButton
              direction="prev"
              disabled={!canPrev}
              onClick={() => canPrev && scrollPage(-1)}
            />
            <CarouselButton
              direction="next"
              disabled={!canNext}
              onClick={() => canNext && scrollPage(1)}
            />
          </div>
        </div>
      </div>

      <ul
        ref={scrollerRef}
        className="-mb-6 mt-2 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-6 px-6 py-8 md:mt-6 md:scroll-px-16 md:px-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* El porcentaje resuelve contra la caja de contenido del scroller, o
            sea el ancho entre los paddings — justo el hueco visible. Con tres
            tarjetas a la vista quedan DOS gaps dentro de ese hueco: de ahí el
            2.5rem, que son los dos `gap-5` de arriba. Si cambia el gap, cambia
            este número. */}
        {productos.map((producto) => (
          <li
            key={producto.id}
            className="w-[85%] shrink-0 snap-start md:w-[calc((100%_-_2.5rem)/3)]"
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
  // `aria-disabled` y no `disabled`: Firefox restaura el estado `disabled` de
  // los controles de formulario al recargar (o volver con bfcache) antes de que
  // React hidrate. El botón queda habilitado en el DOM mientras el primer render
  // lo pide deshabilitado (aún no se midió el scroll) y la hidratación falla.
  // `aria-disabled` no es estado de formulario, así que no se restaura; además
  // mantiene el botón enfocable. El clic se ignora en el padre.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={disabled}
      aria-label={
        direction === "prev" ? "Productos anteriores" : "Productos siguientes"
      }
      className="flex size-11 items-center justify-center rounded-full border border-transparent bg-cream text-ink-muted shadow-card transition-[color,box-shadow,scale] duration-150 ease-out hover:text-moss-deep hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss active:scale-[0.96] aria-disabled:cursor-default aria-disabled:text-ink/40 aria-disabled:shadow-none aria-disabled:hover:text-ink/40 aria-disabled:hover:shadow-none aria-disabled:active:scale-100 motion-reduce:transition-none"
    >
      {direction === "prev" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  );
}
