import type { CSSProperties } from "react";
import styles from "./FlyingCreatures.module.css";

export type FlyingCreatureVariant = "butterfly";

export interface FlyingCreaturesProps {
  /** Total de especímenes, repartidos en partes iguales a cada lado. Par, para que el reparto quede exacto. */
  count?: number;
  /** Por ahora solo hay assets de mariposa; el prop queda listo para "bee" cuando existan esos recortes. */
  variant?: FlyingCreatureVariant;
  bodySrc?: string;
  wingRightSrc?: string;
  wingLeftSrc?: string;
  className?: string;
}

const DEFAULT_ASSETS: Record<FlyingCreatureVariant, { body: string; wingRight: string; wingLeft: string }> = {
  butterfly: {
    body: "/images/animations/butterfly-body.webp",
    wingRight: "/images/animations/butterfly-wing.webp",
    wingLeft: "/images/animations/butterfly-wing-l.webp",
  },
};

interface CreatureSpec {
  x: string;
  size: number;
  delay: string;
  duration: string;
  turnDelay: string;
  turnDuration: string;
  flutterDuration: string;
  rise: string;
  maxOpacity: number;
}

/**
 * Genera specs deterministas (sin `Math.random`, este es un server component
 * y no necesita variar entre cargas) para `half` bichos a un lado: tamaño,
 * demoras y duraciones escalonadas para que no se vean sincronizados, y un
 * ancla horizontal que se aleja progresivamente del borde del texto.
 */
function buildSide(half: number, side: "left" | "right"): CreatureSpec[] {
  return Array.from({ length: half }, (_, i) => {
    const depth = i / Math.max(half - 1, 1); // 0 = más cerca del texto, 1 = más al borde
    const xPercent = 4 + depth * 15; // 4%–19% desde ese borde
    return {
      x: side === "left" ? `${xPercent}%` : `${100 - xPercent}%`,
      size: 0.62 + (i % 3) * 0.16,
      delay: `${(i * 0.7).toFixed(2)}s`,
      duration: `${(6.5 + (i % 3) * 1.3).toFixed(2)}s`,
      turnDelay: `${(i * 0.55 + 0.3).toFixed(2)}s`,
      turnDuration: `${(2.6 + (i % 2) * 0.6).toFixed(2)}s`,
      flutterDuration: `${(0.26 + (i % 3) * 0.04).toFixed(2)}s`,
      rise: `${16 + (i % 3) * 4}vh`,
      maxOpacity: 0.55 + (i % 3) * 0.1,
    };
  });
}

/**
 * Mariposas decorativas volando alrededor del contenido — pensadas primero
 * para flanquear el titular del Hero. Puramente CSS (sin JS de cliente): las
 * variaciones de tamaño/tiempo se calculan en el servidor y se pasan como
 * custom properties, así que no le cuesta nada al LCP ni a la hidratación.
 *
 * Quien lo use debe envolverlo en un contenedor `position: relative` — este
 * componente se pinta como una capa `absolute inset-0` con
 * `overflow: hidden` y `pointer-events: none`, nunca `fixed` sobre todo el
 * viewport, y se retira por completo con `prefers-reduced-motion: reduce` o
 * en pantallas <768px (ver `FlyingCreatures.module.css`).
 */
export function FlyingCreatures({
  count = 6,
  variant = "butterfly",
  bodySrc,
  wingRightSrc,
  wingLeftSrc,
  className,
}: FlyingCreaturesProps) {
  const assets = DEFAULT_ASSETS[variant];
  const half = Math.max(1, Math.round(count / 2));
  const specs = [...buildSide(half, "left"), ...buildSide(half, "right")];

  const assetVars = {
    "--body-src": `url(${bodySrc ?? assets.body})`,
    "--wing-right-src": `url(${wingRightSrc ?? assets.wingRight})`,
    "--wing-left-src": `url(${wingLeftSrc ?? assets.wingLeft})`,
  } as CSSProperties;

  return (
    <div
      className={`${styles.layer} ${className ?? ""}`}
      style={assetVars}
      aria-hidden="true"
    >
      {specs.map((spec, i) => (
        <div
          key={i}
          className={styles.creature}
          style={
            {
              "--x": spec.x,
              "--size": spec.size,
              "--delay": spec.delay,
              "--duration": spec.duration,
              "--rise": spec.rise,
              "--max-opacity": spec.maxOpacity,
            } as CSSProperties
          }
        >
          <div
            className={styles.turn}
            style={
              {
                "--turn-delay": spec.turnDelay,
                "--turn-duration": spec.turnDuration,
              } as CSSProperties
            }
          >
            <div
              className={styles.flutter}
              style={{ "--flutter-duration": spec.flutterDuration } as CSSProperties}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
