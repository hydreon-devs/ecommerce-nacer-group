"use client";

import { useRef, type ReactNode } from "react";
import { useCanvasScrub } from "@/hooks/useCanvasScrub";
import { ACTIVE_HERO } from "@/lib/config";
import { getHero } from "@/lib/content/heroes";
import { HeroLoader } from "./HeroLoader";

/**
 * Zona del hero: el bloque de intro (pasado como `children`, se renderiza en
 * el servidor) y, debajo, la banda de video recorrida por scroll.
 *
 * Tres cosas que esta iteración corrige de forma deliberada, porque el hero
 * anterior se rechazó por ellas:
 *
 * - **Nada se dibuja encima del canvas.** No hay overlay de texto, ni botones,
 *   ni degradados decorativos sobre el video. Todo el copy del hero vive en
 *   `children`, arriba de la banda, en flujo normal de documento. Si alguien
 *   vuelve a meter un `absolute inset-0` con texto aquí dentro, es el bug que
 *   esta versión existe para no repetir.
 * - **No hay recuadro.** La sección entera se pinta con el color ambiente del
 *   propio video (token `--color-hero-ambient` en servidor, muestreo real del
 *   frame en cliente), así el borde de la banda y el fondo del intro son el
 *   mismo color y no hay costura visible. El canvas dibuja en cover real.
 * - **No es una toma de pantalla completa.** La banda mide 70/80vh, no un
 *   viewport entero, y el tramo de scroll es corto (150vh): el titular y el
 *   botón de catálogo ya se ven sin scrollear, y las secciones de abajo
 *   llegan enseguida.
 *
 * `id="hero-zone"` es contrato con `SiteHeader`: mide este bloque para saber
 * cuándo dejar de ser transparente. Si se renombra, hay que cambiarlo allá.
 */
export function HeroSection({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const hero = getHero(ACTIVE_HERO);

  const { canvasRef, isReady, ambientColor } = useCanvasScrub({
    containerRef,
    bandRef,
    frameCount: hero.frameCount,
    framePath: hero.framePath,
    frameSpeed: hero.frameSpeed,
    stillAt: hero.stillAt,
  });

  return (
    <section
      id="hero-zone"
      className="relative bg-hero-ambient"
      style={ambientColor ? { backgroundColor: ambientColor } : undefined}
    >
      {children}

      <div ref={containerRef} className="relative h-[150vh]">
        <div
          ref={bandRef}
          className="sticky top-0 h-[70vh] w-full overflow-hidden md:h-[80vh]"
        >
          {/* Dimensiones fijas por CSS + canvas en bloque: el canvas no
              reserva ni libera espacio al pintar, así que el scrub no puede
              introducir CLS. */}
          <canvas
            ref={canvasRef}
            className="block h-full w-full"
            aria-hidden="true"
          />
          {!isReady && <HeroLoader />}
        </div>
      </div>
    </section>
  );
}
