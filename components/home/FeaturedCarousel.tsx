"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
} from "react";
import { useReducedMotion } from "framer-motion";
import { ProductCard } from "@/components/catalogo/ProductCard";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
} from "@/components/ui/icons";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { Producto } from "@/lib/domain/types";

/** Cada cuánto avanza solo el carrusel. */
const AUTOPLAY_MS = 5000;

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
 * contenido. Ese ancho está acotado a `max-w-5xl` (cabecera incluida, para que
 * los bordes coincidan): sin tope, en pantallas anchas cada tarjeta pasaba de
 * 400px. En móvil se ve una tarjeta completa. Ninguna tarjeta asoma
 * recortada: la pista de que hay más la dan los botones y el avance
 * automático.
 *
 * Recorte de sombras: un contenedor con `overflow-x` no visible obliga a
 * `overflow-y` a computarse como `auto`, así que todo lo que sobresale de su
 * caja de relleno se corta — incluida la sombra de la tarjeta y su elevación en
 * hover (`y: -4`, `scale: 1.02`, `shadow-card-hover`). Por eso el scroller
 * lleva relleno vertical (`py-8`, más que lo que sobresale la sombra, ~24px) y
 * un margen negativo que devuelve el espaciado original al layout. El relleno
 * lateral (`px-4`) es menor que el `gap-5`: deja respirar la sombra pero nunca
 * llega a mostrar un pedazo de la tarjeta vecina.
 *
 * Avance automático: una tarjeta cada `AUTOPLAY_MS`, y al llegar al final
 * vuelve al inicio. Se detiene mientras el puntero está encima o el foco está
 * dentro (nadie quiere que la tarjeta que va a tocar se le escape), y el botón
 * de pausa lo apaga del todo — contenido que se mueve solo más de 5 s necesita
 * un control para pararlo (WCAG 2.2.2). Con `prefers-reduced-motion` no hay
 * avance automático y el botón se oculta.
 *
 * No hay indicador de posición ("1 / n"): el avance automático va de a una
 * tarjeta y las flechas de a tres, así que la "página" actual es ambigua; los
 * botones deshabilitados en los extremos ya dicen dónde está el inicio y el fin.
 */
export function FeaturedCarousel({ productos }: FeaturedCarouselProps) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const autoplay = !prefersReducedMotion && !userPaused && !hovered && !focused;

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

  useEffect(() => {
    if (!autoplay) return;
    const id = window.setInterval(() => {
      const scroller = scrollerRef.current;
      if (scroller) advanceOne(scroller);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [autoplay]);

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
    const pitch = measurePitch(scroller);

    if (pitch === null) {
      scroller.scrollBy({ left: direction * scroller.clientWidth, behavior });
      return;
    }

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

  function handleBlur(event: FocusEvent<HTMLElement>) {
    // `blur` también salta al mover el foco entre tarjetas; solo cuenta como
    // salida si el nuevo foco quedó fuera de la sección.
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  }

  if (productos.length === 0) return null;

  return (
    <section
      aria-labelledby="destacados-title"
      className="border-b border-ink/8 bg-cream-soft/45 py-20 md:py-28"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 md:flex-row md:items-end md:justify-between md:px-16">
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
            <button
              type="button"
              onClick={() => setUserPaused((paused) => !paused)}
              aria-label={
                userPaused
                  ? "Reanudar avance automático"
                  : "Pausar avance automático"
              }
              className={`${BUTTON_CLASS} motion-reduce:hidden`}
            >
              {userPaused ? (
                <PlayIcon width={16} height={16} />
              ) : (
                <PauseIcon width={16} height={16} />
              )}
            </button>
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

      {/* El margen lateral vive aquí y no en el scroller: el padding de un
          contenedor con overflow es área visible, y en él asomaban recortadas
          las tarjetas vecinas. `px-2`/`md:px-12` + el `px-4` del scroller
          suman el `px-6`/`md:px-16` de la cabecera, así los bordes alinean. */}
      <div className="mx-auto max-w-5xl px-2 md:px-12">
        <ul
          ref={scrollerRef}
          className="-mb-6 mt-2 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 py-8 md:mt-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
      </div>
    </section>
  );
}

/**
 * Distancia entre el inicio de dos tarjetas consecutivas. Se mide entre
 * tarjetas reales en vez de asumir un ancho: el ancho cambia por breakpoint y
 * el gap vive solo en las clases. `null` si hay menos de dos tarjetas.
 */
function measurePitch(scroller: HTMLElement): number | null {
  const items = scroller.children;
  if (items.length < 2) return null;
  return (
    (items[1] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft
  );
}

/**
 * Paso del avance automático: una tarjeta, o de vuelta al inicio si ya se ve
 * la última. Solo corre sin reduced motion, así que siempre es `smooth`.
 */
function advanceOne(scroller: HTMLElement) {
  const pitch = measurePitch(scroller);
  if (pitch === null) return;

  const { scrollLeft, scrollWidth, clientWidth } = scroller;
  if (scrollWidth <= clientWidth) return;

  if (scrollLeft + clientWidth >= scrollWidth - 4) {
    scroller.scrollTo({ left: 0, behavior: "smooth" });
  } else {
    scroller.scrollBy({ left: pitch, behavior: "smooth" });
  }
}

const BUTTON_CLASS =
  "flex size-11 items-center justify-center rounded-full border border-transparent bg-cream text-ink-muted shadow-card transition-[color,box-shadow,scale] duration-150 ease-out hover:text-moss-deep hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss active:scale-[0.96] aria-disabled:cursor-default aria-disabled:text-ink/40 aria-disabled:shadow-none aria-disabled:hover:text-ink/40 aria-disabled:hover:shadow-none aria-disabled:active:scale-100 motion-reduce:transition-none";

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
      className={BUTTON_CLASS}
    >
      {direction === "prev" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  );
}
