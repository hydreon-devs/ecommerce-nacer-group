"use client";

import { useState, type CSSProperties } from "react";
import { Polaroid } from "@/components/home/Polaroid";
import { PauseIcon, PlayIcon } from "@/components/ui/icons";
import type { Occasion } from "@/lib/content/home";
import { marqueeDurationSeconds } from "@/lib/motion/marquee";

interface OccasionsRailProps {
  occasions: Occasion[];
}

/**
 * Marquee infinito de polaroids. Sin librería: la lista se renderiza dos veces
 * en un mismo track y `globals.css` lo desplaza `translateX(0 -> -50%)` en
 * lineal (solo `transform`), de modo que el bucle cae exacto sobre la copia.
 * Cada lista lleva `pr-9` igual al `gap-9`: así el hueco entre copias es el
 * mismo que entre tarjetas y no hay salto.
 *
 * Pausas: puntero sobre una tarjeta (`:has(li:hover)`), foco dentro del rail
 * (`:focus-within`) y el botón de pausa. Este último es obligatorio (WCAG 2.2.2:
 * contenido que se mueve solo más de 5 s) y además es el único camino en táctil,
 * donde no existe hover. Las tarjetas no son enfocables; el contenedor sí
 * (`tabIndex=0`) para poder detener el movimiento con teclado.
 *
 * Reduced motion se resuelve solo en CSS, no con JS, para no desajustar la
 * hidratación: sin animación, sin botón, sin la copia duplicada y el contenedor
 * pasa a `overflow-x-auto` con `scroll-snap`, así todo el contenido sigue
 * alcanzable. La copia va `aria-hidden` e `inert`: no existe para lectores de
 * pantalla.
 *
 * Recorte de la elevación: `overflow` no visible corta lo que sobresale, incluido
 * el `y: -18` del hover y la sombra. Por eso el relleno vertical y el margen
 * negativo que devuelve el espaciado original (misma técnica que
 * `FeaturedCarousel`).
 */
export function OccasionsRail({ occasions }: OccasionsRailProps) {
  const [userPaused, setUserPaused] = useState(false);

  return (
    <div className="occasions-rail">
      <div className="occasions-toggle mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setUserPaused((paused) => !paused)}
          aria-label={
            userPaused
              ? "Reanudar desplazamiento automático"
              : "Pausar desplazamiento automático"
          }
          className="flex size-11 items-center justify-center rounded-full border border-transparent bg-cream text-ink-muted shadow-card transition-[color,box-shadow,scale] duration-150 ease-out hover:text-moss-deep hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss active:scale-[0.96] motion-reduce:transition-none"
        >
          {userPaused ? (
            <PlayIcon width={16} height={16} />
          ) : (
            <PauseIcon width={16} height={16} />
          )}
        </button>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="Ocasiones"
        className="-mb-10 snap-x snap-mandatory overflow-hidden scroll-px-6 px-6 pb-14 pt-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss motion-reduce:overflow-x-auto motion-reduce:[scrollbar-width:none] motion-reduce:[&::-webkit-scrollbar]:hidden"
      >
        <div
          className="occasions-track flex w-max"
          data-paused={userPaused}
          style={
            {
              "--marquee-duration": `${marqueeDurationSeconds(occasions.length)}s`,
            } as CSSProperties
          }
        >
          <ul className="flex gap-9 pr-9">
            {occasions.map((occasion) => (
              <li key={occasion.id} className="shrink-0 snap-start">
                <Polaroid occasion={occasion} />
              </li>
            ))}
          </ul>
          <ul aria-hidden="true" inert className="occasions-copy flex gap-9 pr-9">
            {occasions.map((occasion) => (
              <li key={occasion.id} className="shrink-0">
                <Polaroid occasion={occasion} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
