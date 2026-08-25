"use client";

import { useRef, type ReactNode } from "react";
import { BACKDROP_SCALE, useCanvasScrub } from "@/hooks/useCanvasScrub";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ACTIVE_HERO } from "@/lib/config";
import { getHero } from "@/lib/content/heroes";
import { HeroLoader } from "./HeroLoader";

/**
 * El `lg` de Tailwind, escrito a mano porque `matchMedia` no lee el tema.
 * Tiene que coincidir con los prefijos `lg:` de este archivo: es el mismo
 * umbral visto desde CSS y desde JS. Si se cambia uno hay que cambiar el otro,
 * o el hero se quedaría fijo con la geometría del scrub, o al revés.
 */
const SCRUB_QUERY = "(min-width: 1024px)";

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
 *   mismo color y no hay costura visible.
 * El hero tiene DOS regímenes, y no son variaciones de tamaño del mismo: son
 * dos piezas distintas que comparten el canvas.
 *
 * **Móvil y tablet (bajo `lg`) — imagen fija, sin scroll.** La banda no es
 * `sticky`, no hay contenedor alto y no hay secuencia: se dibuja un solo frame
 * (`stillAt`) y se descarga una sola imagen en lugar de 192. La banda toma el
 * aspecto del video (`aspect-video`), así que el frame entra entero — 97% del
 * ancho, la envergadura de la mariposa (70%) con margen de sobra. Sin recorte
 * no hace falta ni el tope de `minVisibleWidth` ni el telón: ahí esa maquinaria
 * queda inactiva por geometría, no por una condición.
 *
 * **Desde `lg` — banda a pantalla completa recorrida por scroll.** Aquí sí
 * aplica todo lo demás:
 *
 * - **La banda ocupa el viewport entero mientras está fijada.** Una banda más
 *   baja que el viewport deja por debajo un hueco por el que asoma la sección
 *   siguiente antes de que el video termine — con la geometría anterior
 *   (banda 80vh, contenedor 150vh) la crema de `ValueProps` entraba en escena
 *   desde el 71% del recorrido. `100lvh` cierra ese hueco por construcción.
 * - **`lvh`, no `vh` ni `dvh`.** `vh` se mide contra el viewport sin la barra
 *   del navegador: al colapsarse la barra la banda queda más baja que la
 *   pantalla y el hueco reaparece. `dvh` calza exacto pero cambia durante el
 *   scroll, y como el contenedor también se mediría en `dvh` el recorrido
 *   fijado se recalcularía a media animación y el frame saltaría. `lvh` es el
 *   viewport más grande posible: la banda nunca es más baja que la pantalla y
 *   la geometría no se mueve.
 * - **El canvas no dibuja cover puro.** En ventanas más altas que anchas en
 *   proporción (por encima de 0.74) un cover puro ampliaría tanto que cortaría
 *   las alas. `useCanvasScrub` acota el aumento con `minVisibleWidth` y lo que
 *   queda libre arriba y abajo lo ocupa el telón desenfocado — el propio frame
 *   estirado y borroso, nunca un color plano. Sigue haciendo falta: una ventana
 *   de 1024 de ancho puede ser mucho más alta que eso.
 *
 * El corte entre regímenes se decide dos veces y a propósito: la geometría con
 * prefijos `lg:` (CSS, correcta desde el primer pintado, sin salto al hidratar)
 * y el comportamiento con `useMediaQuery` (JS, resuelto tras hidratar). Ver
 * `SCRUB_QUERY`.
 *
 * `id="hero-zone"` es contrato con `SiteHeader`: mide este bloque para saber
 * cuándo dejar de ser transparente. Si se renombra, hay que cambiarlo allá.
 */
export function HeroSection({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const hero = getHero(ACTIVE_HERO);
  const scrub = useMediaQuery(SCRUB_QUERY);

  const { canvasRef, backdropRef, isReady, ambientColor } = useCanvasScrub({
    containerRef,
    bandRef,
    frameCount: hero.frameCount,
    framePath: hero.framePath,
    frameSpeed: hero.frameSpeed,
    stillAt: hero.stillAt,
    minVisibleWidth: hero.minVisibleWidth,
    letterbox: hero.letterbox,
    scrub,
  });

  return (
    <section
      id="hero-zone"
      className="relative bg-hero-ambient"
      style={ambientColor ? { backgroundColor: ambientColor } : undefined}
    >
      {children}

      {/* Bajo lg el contenedor no aporta alto: la banda ocupa lo suyo y la
          página sigue. Desde lg pasa a 220lvh, que menos los 100lvh de la
          banda deja 120lvh de recorrido fijado para los 192 frames. */}
      <div ref={containerRef} className="relative lg:h-[220lvh]">
        <div
          ref={bandRef}
          className="relative aspect-video w-full overflow-hidden lg:sticky lg:top-0 lg:aspect-auto lg:h-[100lvh]"
        >
          {/* Telón: el frame entero, borroso, detrás del canvas nítido. Solo
              se ve donde el cover acotado no llega, es decir en la banda a
              pantalla completa de ventanas estrechas; bajo lg queda tapado
              por completo porque ahí el frame entra entero. La escala
              compensa el radio del
              desenfoque para que no asome el borde transparente, y viene del
              hook porque el muestreo del color ambiente usa ese mismo número
              para saber qué fila del frame cae en el borde de la banda — si se
              escribiera aquí como clase suelta, los dos se desincronizarían. */}
          <canvas
            ref={backdropRef}
            aria-hidden="true"
            style={{ transform: `scale(${BACKDROP_SCALE})` }}
            className="pointer-events-none absolute inset-0 h-full w-full blur-3xl"
          />
          {/* Dimensiones fijas por CSS + canvas en bloque: el canvas no
              reserva ni libera espacio al pintar, así que el scrub no puede
              introducir CLS. */}
          <canvas
            ref={canvasRef}
            className="relative block h-full w-full"
            aria-hidden="true"
          />
          {!isReady && <HeroLoader />}
        </div>
      </div>
    </section>
  );
}
