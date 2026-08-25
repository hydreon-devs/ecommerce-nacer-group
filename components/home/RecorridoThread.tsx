"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import creature from "@/components/decor/FlyingCreatures.module.css";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/** Ondas completas a lo largo de todo el recorrido — una por sección. */
const WAVES = 5;

/** Amplitud del serpenteo, como fracción del ancho de la capa. */
const AMPLITUDE = 0.3;

/** Muestras del trazo. Con este número la polilínea ya no se lee como recta. */
const SAMPLES = 260;

/** Lado del cuadro que contiene a la mariposa, en píxeles. */
const BUTTERFLY_SIZE = 56;

/** Opacidad de la mariposa mientras cruza una sección sobria. */
const CALM_OPACITY = 0.5;

/** Margen de progreso (0-1) de las transiciones de entrada y salida. */
const FADE = 0.04;

interface Geometry {
  width: number;
  height: number;
  /** `d` del trazo, ya en píxeles. */
  d: string;
  /** Longitud del trazo en píxeles, sumada de sus propios segmentos. */
  length: number;
}

const EMPTY_GEOMETRY: Geometry = { width: 0, height: 0, d: "", length: 0 };

function threadX(t: number, width: number): number {
  return width / 2 + Math.sin(t * Math.PI * 2 * WAVES) * (width * AMPLITUDE);
}

/**
 * Construye el trazo directamente en píxeles.
 *
 * Antes el SVG usaba una rejilla normalizada (`viewBox` 100×1000) estirada con
 * `preserveAspectRatio="none"`, y ahí estaba el bug del relleno: el patrón de
 * `stroke-dasharray` se resuelve en el espacio del trazo —que con
 * `vector-effect="non-scaling-stroke"` es el de pantalla— mientras que
 * `pathLength` normaliza en espacio de usuario. Con el SVG estirado 2.4× en
 * vertical los dos espacios no coinciden y el relleno salía a parches en vez de
 * avanzar de arriba abajo.
 *
 * Con el `viewBox` en píxeles la escala es 1:1 y no hay dos sistemas de
 * unidades que puedan discrepar: `length`, el `dasharray` y el `dashoffset`
 * hablan todos del mismo espacio.
 */
function buildGeometry(width: number, height: number): Geometry {
  if (width === 0 || height === 0) return EMPTY_GEOMETRY;

  const points: Array<[number, number]> = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    points.push([threadX(t, width), t * height]);
  }

  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
    );
  }

  const d = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");

  return { width, height, d, length };
}

/** Rangos [inicio, fin] de progreso ocupados por secciones sobrias. */
type SoberRange = [number, number];

/**
 * Opacidad de la mariposa en `t`.
 *
 * Sobre una sección sobria no se apaga: baja a `CALM_OPACITY` y sigue su
 * camino. Desaparece del todo al TERMINAR esa sección, que es donde termina el
 * recorrido — la mariposa completa el trayecto y se va, en vez de esfumarse a
 * mitad de camino.
 */
function butterflyOpacityAt(t: number, ranges: SoberRange[]): number {
  let opacity = 1;

  for (const [start, end] of ranges) {
    if (t < start - FADE || t > end) continue;

    if (t < start) {
      // Entrando: de 1 a CALM_OPACITY.
      const k = (start - t) / FADE;
      opacity = Math.min(opacity, CALM_OPACITY + (1 - CALM_OPACITY) * k);
    } else if (t > end - FADE) {
      // Saliendo por el final de la sección: de CALM_OPACITY a 0.
      const k = (end - t) / FADE;
      opacity = Math.min(opacity, CALM_OPACITY * Math.max(0, k));
    } else {
      opacity = Math.min(opacity, CALM_OPACITY);
    }
  }

  // Fuera de toda sección sobria, el final del recorrido también apaga.
  if (ranges.length === 0 && t > 1 - FADE) {
    opacity = Math.min(opacity, Math.max(0, (1 - t) / FADE));
  }

  return opacity;
}

interface RecorridoThreadProps {
  /** Contenedor que envuelve a todas las secciones del recorrido. */
  containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Hilo del recorrido: un trazo continuo que baja por el centro de las secciones
 * narrativas, se rellena a medida que se hace scroll y lleva una mariposa
 * posada en la punta del relleno.
 *
 * No es adorno. El video del hero es una crisálida colgando de un hilo de seda,
 * y `ScrollIndicator` ya se define como la continuación visual de ese hilo:
 * esto es el resto del hilo. Por eso el trazo es uno solo de arriba abajo y no
 * un elemento por sección — cortarlo entre secciones rompería justamente lo que
 * lo justifica.
 *
 * Tres decisiones que vienen de reglas del proyecto, no del gusto:
 *
 * - **La mariposa se atenúa sobre las secciones sobrias.** `acompanar` habla de
 *   duelo, así que ahí baja a `CALM_OPACITY` y desaparece justo al terminar la
 *   sección, que es donde termina el recorrido: completa el trayecto y se va.
 *   El aleteo NO se detiene — se probó pausarlo y se descartó: una mariposa
 *   inmóvil a media opacidad se leía como un fallo de carga, no como respeto.
 *   El registro sobrio lo llevan la atenuación y la salida, no la quietud.
 *   Los rangos se miden del DOM (`[data-sober-thread]`), no se codifican a
 *   mano, así que reordenar `HOME_SECTIONS` no los desalinea.
 * - **Sin mariposa bajo `md`.** `FlyingCreatures.module.css` ya la retira bajo
 *   768px por decisión explícita de no competir por atención ni rendimiento en
 *   pantallas chicas. Aquí se respeta el mismo corte; el hilo sí se dibuja.
 * - **Con `prefers-reduced-motion` el trazo aparece completo y quieto**, y no
 *   hay mariposa. Es el mismo criterio que aplica `FlyingCreatures`, que se
 *   oculta por completo.
 *
 * El relleno anima `stroke-dashoffset`, que es pintado y no dispara layout: es
 * una de las dos excepciones admitidas a "animar solo transform y opacity"
 * (`nacer-motion` §2.5). La mariposa se mueve solo con `transform`.
 *
 * El trazo se construye después de medir, así que no existe en el HTML del
 * servidor. Es aceptable porque la capa es decorativa, `aria-hidden` y queda
 * bajo la línea de flotación; a cambio, la geometría es exacta en cualquier
 * tamaño en vez de depender de un estiramiento.
 */
export function RecorridoThread({ containerRef }: RecorridoThreadProps) {
  const prefersReducedMotion = useReducedMotion();
  const showButterfly = useMediaQuery("(min-width: 768px)");

  /**
   * La CAPA del hilo, no el contenedor del recorrido.
   *
   * La distinción es la que rompía la posición de la mariposa: ella es hija de
   * esta capa, así que su `x` se mide contra el ancho de la capa. Medir el
   * contenedor —que ocupa todo el ancho de la página— multiplicaba la
   * coordenada por 1440 en vez de por 160 y la mandaba fuera de pantalla, con
   * un desvío que además crecía con el scroll.
   */
  const layerRef = useRef<HTMLDivElement>(null);

  const [geometry, setGeometry] = useState<Geometry>(EMPTY_GEOMETRY);
  const soberRangesRef = useRef<SoberRange[]>([]);

  const width = useMotionValue(0);
  const height = useMotionValue(0);
  // La longitud va en un MotionValue y no solo en `geometry`: `useTransform`
  // recalcula cuando cambia alguna de sus entradas, así que si dependiera del
  // estado el trazo se quedaría relleno del todo hasta el primer scroll.
  const length = useMotionValue(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  // Muelle suave: el relleno sigue al scroll sin pegarse a él cuadro a cuadro,
  // que es lo que hace que el hilo se sienta un hilo y no una barra de carga.
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.3,
  });

  // Mide la capa y localiza las secciones sobrias. Las dos cosas dependen del
  // layout, así que se recalculan juntas en cada resize.
  useEffect(() => {
    const container = containerRef.current;
    const layer = layerRef.current;
    if (!container || !layer) return;

    function measure() {
      if (!container || !layer) return;
      const rect = layer.getBoundingClientRect();
      width.set(rect.width);
      height.set(rect.height);
      setGeometry((prev) => {
        if (prev.width === rect.width && prev.height === rect.height) return prev;
        const next = buildGeometry(rect.width, rect.height);
        length.set(next.length);
        return next;
      });

      if (rect.height === 0) {
        soberRangesRef.current = [];
        return;
      }

      // Posición vía `getBoundingClientRect` y no `offsetTop`: este último es
      // relativo al `offsetParent`, que no tiene por qué ser la capa, y restar
      // los dos daría un desfase silencioso.
      const nodes =
        container.querySelectorAll<HTMLElement>("[data-sober-thread]");
      soberRangesRef.current = Array.from(nodes).map((node) => {
        const nodeRect = node.getBoundingClientRect();
        const top = nodeRect.top - rect.top;
        return [top / rect.height, (top + nodeRect.height) / rect.height];
      });
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, width, height, length]);

  const dashOffset = useTransform([progress, length], ([t, len]: number[]) =>
    prefersReducedMotion ? 0 : len * (1 - Math.min(1, Math.max(0, t))),
  );

  const x = useTransform([progress, width], ([t, w]: number[]) =>
    threadX(t, w) - BUTTERFLY_SIZE / 2,
  );

  const y = useTransform(
    [progress, height],
    ([t, h]: number[]) => t * h - BUTTERFLY_SIZE / 2,
  );

  // Inclinación según la tangente del trazo, amortiguada: la mariposa insinúa
  // hacia dónde va sin llegar a acostarse.
  const rotate = useTransform([progress, width, height], ([t, w, h]: number[]) => {
    if (h === 0) return 0;
    const dx = Math.cos(t * Math.PI * 2 * WAVES) * w * AMPLITUDE * Math.PI * 2 * WAVES;
    return ((Math.atan2(dx, h) * 180) / Math.PI) * 0.4;
  });

  const opacity = useTransform(progress, (t: number) =>
    butterflyOpacityAt(t, soberRangesRef.current),
  );

  const assetVars = {
    "--body-src": "url(/images/animations/butterfly-body.webp)",
    "--wing-right-src": "url(/images/animations/butterfly-wing.webp)",
    "--wing-left-src": "url(/images/animations/butterfly-wing-l.webp)",
    "--flutter-duration": "0.3s",
  } as CSSProperties;

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-4 w-10 md:left-1/2 md:w-40 md:-translate-x-1/2"
    >
      {geometry.d && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          fill="none"
        >
          {/* Trazo de fondo: el recorrido completo, siempre visible, para que
              se vea cuánto falta y no solo cuánto se lleva. */}
          <path
            d={geometry.d}
            stroke="var(--color-ink)"
            strokeOpacity={0.12}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <motion.path
            d={geometry.d}
            stroke="var(--color-amber)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={geometry.length}
            style={{ strokeDashoffset: dashOffset }}
          />
        </svg>
      )}

      {showButterfly && !prefersReducedMotion && geometry.d && (
        <motion.div
          className="absolute left-0 top-0"
          style={{
            x,
            y,
            rotate,
            opacity,
            width: BUTTERFLY_SIZE,
            height: BUTTERFLY_SIZE,
          }}
        >
          {/* Se reutiliza `.flutter` de `FlyingCreatures.module.css` en vez de
              duplicar el aleteo: mismos recortes de ala y mismos keyframes que
              las mariposas del hero. Lo que NO se reutiliza es `.turn`, el
              bamboleo errático — esta mariposa sigue un hilo, no deriva. */}
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              ...assetVars,
              perspective: 600,
              transformStyle: "preserve-3d",
            }}
          >
            <div className={creature.flutter} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
