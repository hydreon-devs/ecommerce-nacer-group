"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { useFramePreloader } from "./useFramePreloader";

/**
 * Resolución del telón (`backdrop`). Es deliberadamente diminuto: solo aporta
 * color, no detalle — se estira al tamaño de la banda y se desenfoca por CSS.
 * Dibujar 32×18 por frame es gratis; desenfocar el canvas grande con
 * `ctx.filter` en cada evento de scroll no lo sería.
 */
const BACKDROP_WIDTH = 32;
const BACKDROP_HEIGHT = 18;

/**
 * Cuánto se agranda el telón. El desenfoque difumina también sus bordes, así
 * que el elemento tiene que sobresalir de la banda o asomaría el borde
 * transparente.
 *
 * Se exporta porque hay dos consumidores y tienen que usar el mismo número:
 * `HeroSection` lo aplica como `transform`, y `sampleTopEdgeColor` lo necesita
 * para saber qué parte del frame acaba en el borde superior de la banda. Si se
 * cambia en el CSS y no aquí, el color del intro deja de coincidir.
 */
export const BACKDROP_SCALE = 1.5;

/**
 * Media anchura, en fracción del alto útil del frame, de la franja que se
 * promedia para representar al telón desenfocado. El radio de desenfoque real
 * ronda ese orden a los tamaños de banda que usamos, y el promedio es poco
 * sensible al valor exacto porque la viñeta varía de forma suave.
 */
const BACKDROP_SAMPLE_SPREAD = 0.05;

interface UseCanvasScrubOptions {
  /** Wrapper alto que define el tramo de scroll (el que contiene al sticky). */
  containerRef: RefObject<HTMLDivElement | null>;
  /** La banda `sticky` en sí. Su altura real es lo que decide cuánto recorrido
   * fijado hay: `recorrido = alto(container) - alto(banda)`. */
  bandRef: RefObject<HTMLDivElement | null>;
  frameCount: number;
  framePath: (index: number) => string;
  /** Ver `HeroDefinition.frameSpeed` en `lib/content/heroes.ts`. */
  frameSpeed: number;
  /** Ver `HeroDefinition.stillAt`. */
  stillAt: number;
  /** Ver `HeroDefinition.minVisibleWidth`. */
  minVisibleWidth: number;
  /** Ver `HeroDefinition.letterbox`. */
  letterbox: number;
  /**
   * Si el hero recorre la secuencia con el scroll o se queda en un solo frame.
   *
   * Lo decide `HeroSection` a partir del breakpoint, porque es ahí donde viven
   * las clases responsive que definen la geometría de la banda. En móvil y
   * tablet es `false`: la banda no es `sticky`, no hay tramo fijado que
   * recorrer, y se descarga una sola imagen en lugar de la secuencia entera.
   */
  scrub: boolean;
}

interface UseCanvasScrubResult {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /**
   * Canvas del telón: el mismo frame estirado a `BACKDROP_WIDTH × BACKDROP_HEIGHT`.
   * Va detrás del canvas principal y quien lo monte debe desenfocarlo por CSS.
   * Es lo que ocupa la franja que el cover acotado deja libre en vertical.
   */
  backdropRef: RefObject<HTMLCanvasElement | null>;
  isReady: boolean;
  /**
   * Color muestreado de los bordes del video, para pintar la sección que lo
   * envuelve sin costura visible. `null` hasta que hay un frame cargado —
   * quien lo consuma debe caer al token CSS mientras tanto.
   */
  ambientColor: string | null;
}

function averageRegion(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): [number, number, number] {
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 8, 8);
  const data = ctx.getImageData(0, 0, 8, 8).data;
  let r = 0;
  let g = 0;
  let b = 0;
  const count = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return [r / count, g / count, b / count];
}

/**
 * Escala con la que se dibuja un frame en la banda. Vive fuera del hook porque
 * la usan dos cosas: el dibujado y el muestreo del color ambiente, que tiene
 * que resolver exactamente el mismo encuadre para acertar el borde.
 *
 * Cover mientras el sujeto quepa, acotado por `minVisibleWidth` cuando no.
 * `maxScale` siempre produce `drawWidth >= width`, así que en horizontal el
 * cover nunca se rompe.
 */
function scaleForFrame(
  srcWidth: number,
  srcHeight: number,
  width: number,
  height: number,
  minVisibleWidth: number,
): number {
  const coverScale = Math.max(width / srcWidth, height / srcHeight);
  const maxScale = width / (srcWidth * minVisibleWidth);
  return Math.min(coverScale, maxScale);
}

/**
 * Región útil del frame: el alto sin las barras negras de letterbox del video
 * (ver `HeroDefinition.letterbox`). Todo lo que dibuja o muestrea trabaja sobre
 * esta región, nunca sobre el frame completo.
 */
function usableSource(
  img: HTMLImageElement,
  letterbox: number,
): { top: number; height: number } {
  const inset = Math.round(img.height * letterbox);
  return { top: inset, height: Math.max(1, img.height - inset * 2) };
}

/**
 * Color del borde SUPERIOR de la banda, que es el píxel que toca el bloque de
 * intro. Lo consume la sección que envuelve al hero como color de fondo: si
 * los dos coinciden, ver un fragmento de la banda antes de scrollear se lee
 * como la viñeta del video continuando el fondo, no como una costura.
 *
 * La versión anterior muestreaba las franjas laterales a media altura. Ese es
 * el punto equivocado: en estos frames los laterales a media altura son lo más
 * oscuro de la viñeta, mientras que el borde superior del recorte está bastante
 * más claro. La diferencia se veía como una línea horizontal dura a todo lo
 * ancho, justo debajo del intro.
 *
 * Hay DOS cosas distintas que pueden estar en ese borde, y muestrear la
 * equivocada deja la costura igual de visible:
 *
 * - **El frame**, cuando cubre el alto de la banda. El borde es la fila que el
 *   recorte vertical deja arriba, dentro de la ventana horizontal visible.
 * - **El telón**, cuando `minVisibleWidth` acotó la escala y el frame no llega
 *   a cubrir el alto — el caso de móvil vertical y de ventanas de escritorio
 *   más altas que anchas en proporción. Ahí el borde es el frame estirado a
 *   todo el alto de la banda, agrandado por `BACKDROP_SCALE` y desenfocado, así
 *   que la fila que cae en `y = 0` no es la primera del frame sino la que marca
 *   esa escala.
 *
 * Medido sobre `emergencia`: la franja lateral que se usaba antes da
 * `rgb(15,8,1)`, mientras que el telón en el borde superior da `rgb(29,18,6)`
 * — casi el doble de luminancia, y en un rango oscuro eso se lee como una línea
 * dura a todo lo ancho. Es exactamente lo que se veía debajo del intro.
 */
function sampleTopEdgeColor(
  img: HTMLImageElement,
  letterbox: number,
  width: number,
  height: number,
  scale: number,
): string | null {
  try {
    const off = document.createElement("canvas");
    off.width = 8;
    off.height = 8;
    const ctx = off.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    const { top, height: srcHeight } = usableSource(img, letterbox);
    const covered = srcHeight * scale >= height;

    let sourceWidth: number;
    let sampleY: number;
    let sampleHeight: number;

    if (covered) {
      sourceWidth = Math.min(img.width, width / scale);
      sampleY = top + (srcHeight - height / scale) / 2;
      sampleHeight = srcHeight * 0.08;
    } else {
      // Fracción del frame que el telón deja en `y = 0` de la banda: el
      // elemento sobresale (BACKDROP_SCALE - 1) repartido arriba y abajo.
      const topFraction = (BACKDROP_SCALE - 1) / (2 * BACKDROP_SCALE);
      sourceWidth = img.width / BACKDROP_SCALE;
      sampleY = top + (topFraction - BACKDROP_SAMPLE_SPREAD) * srcHeight;
      sampleHeight = 2 * BACKDROP_SAMPLE_SPREAD * srcHeight;
    }

    const sx = Math.max(0, Math.round((img.width - sourceWidth) / 2));
    const sy = Math.min(
      top + srcHeight - 1,
      Math.max(top, Math.round(sampleY)),
    );

    const [r, g, b] = averageRegion(
      ctx,
      img,
      sx,
      sy,
      Math.max(1, Math.min(Math.round(sourceWidth), img.width - sx)),
      Math.max(1, Math.min(Math.round(sampleHeight), top + srcHeight - sy)),
    );

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  } catch {
    return null;
  }
}

/**
 * Scroll-scrub del hero en canvas 2D (no `<video>`: hay que poder ir cuadro a
 * cuadro con el scroll).
 *
 * Tres decisiones, cada una corrige un rechazo concreto de una iteración
 * anterior:
 *
 * 1. **Cover acotado, nunca recuadro.** La primera versión dibujaba con
 *    `Math.min(...) * 0.85` y rellenaba el sobrante con un color plano: eso era
 *    el "recuadro" que se rechazó. La segunda pasó a `Math.max(...)` (cover
 *    puro), que elimina el recuadro pero en móvil vertical amplía tanto que
 *    corta las alas de la mariposa. La regla actual es
 *    `Math.min(coverScale, maxScale)`: cover mientras el sujeto quepa
 *    (siempre, en horizontal), y acotado cuando no. Lo que el cover acotado
 *    deja libre en vertical NO se rellena con un color plano — lo ocupa el
 *    telón desenfocado, que es el propio frame estirado, así que no hay borde
 *    que leer como recuadro. Si alguien vuelve a poner un `fillRect` de color
 *    sólido detrás del frame, ese es el bug que esta versión evita.
 * 2. **El progreso se calcula de la geometría real**, no de `useScroll({target,
 *    offset})`. Los offsets de Framer se expresan contra el alto del viewport,
 *    y el tramo fijado no mide un viewport (la banda es `100lvh` dentro de un
 *    contenedor de `190lvh`/`220lvh`), así que `["start start", "end end"]`
 *    llegaría a 1 desfasado. Midiendo `container` y `band` el recorrido calza
 *    exacto en cualquier breakpoint, sin acoplar el hook a las clases de
 *    Tailwind.
 * 3. **El color ambiente se muestrea del borde superior de la banda**, no de
 *    los laterales, y se recalcula en cada resize. El canvas ya no lo usa: lo
 *    consume la sección que envuelve al hero, para que el fondo del intro y el
 *    primer píxel de la banda sean el mismo color y el fragmento de banda que
 *    asoma antes de scrollear no se lea como una costura. Ver
 *    `sampleTopEdgeColor`.
 *
 * Con `prefers-reduced-motion` no se suscribe al scroll: pinta un único frame
 * representativo (`stillAt`) y no vuelve a tocar el canvas.
 */
export function useCanvasScrub({
  containerRef,
  bandRef,
  frameCount,
  framePath,
  frameSpeed,
  stillAt,
  minVisibleWidth,
  letterbox,
  scrub,
}: UseCanvasScrubOptions): UseCanvasScrubResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backdropRef = useRef<HTMLCanvasElement>(null);
  const [ambientColor, setAmbientColor] = useState<string | null>(null);
  const currentFrameRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  const stillFrame = Math.min(
    frameCount - 1,
    Math.max(0, Math.round(frameCount * stillAt)),
  );

  /**
   * Único predicado que decide si esto es un scrub o una imagen fija. Las dos
   * razones para quedarse quieto — el breakpoint y la preferencia del sistema —
   * se colapsan aquí para que ningún efecto vuelva a combinarlas por su cuenta.
   */
  const animate = scrub && !prefersReducedMotion;

  const { imagesRef, eagerReady } = useFramePreloader(frameCount, framePath, {
    eagerCount: animate ? 10 : 0,
    priorityIndex: stillFrame,
    loadAll: animate,
  });

  const { scrollY } = useScroll();

  const drawFrame = useCallback(
    (index: number) => {
      const canvas = canvasRef.current;
      const img = imagesRef.current[index];
      if (!canvas || !img) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { width, height } = canvas;
      if (width === 0 || height === 0) return;

      // Telón primero: el frame entero, estirado a la resolución mínima. No
      // necesita saber nada del encuadre — solo aporta el color que ocupará
      // la franja libre. El desenfoque lo pone CSS, no este canvas.
      const { top, height: srcHeight } = usableSource(img, letterbox);

      const backdrop = backdropRef.current;
      const backdropCtx = backdrop?.getContext("2d");
      if (backdrop && backdropCtx) {
        backdropCtx.drawImage(
          img,
          0,
          top,
          img.width,
          srcHeight,
          0,
          0,
          backdrop.width,
          backdrop.height,
        );
      }

      // Cover acotado (ver punto 1 de la nota del hook). Lo único que puede
      // quedar libre es una franja arriba y abajo, nunca a los lados.
      const scale = scaleForFrame(
        img.width,
        srcHeight,
        width,
        height,
        minVisibleWidth,
      );

      const drawWidth = img.width * scale;
      const drawHeight = srcHeight * scale;

      // `clearRect`, no `fillRect`: donde el frame no llega tiene que verse el
      // telón desenfocado. Un color plano aquí sería el recuadro otra vez.
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(
        img,
        0,
        top,
        img.width,
        srcHeight,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );

      currentFrameRef.current = index;
    },
    [imagesRef, minVisibleWidth, letterbox],
  );

  /**
   * Iguala el fondo de la sección al borde superior de la banda.
   *
   * Se recalcula en cada resize, no una sola vez: el encuadre depende del
   * tamaño de la banda, así que el píxel que queda pegado a ese borde cambia
   * con el viewport.
   *
   * Muestrea el frame que se ve EN REPOSO, que es el único momento en que el
   * intro y la banda comparten pantalla — el 0 con scrub, o `stillFrame` con
   * `prefers-reduced-motion`. Una vez fijada, la banda ocupa el viewport
   * entero y ya no hay borde que igualar.
   */
  const syncAmbient = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const restIndex = animate ? 0 : stillFrame;
    const img = imagesRef.current[restIndex] ?? imagesRef.current[stillFrame];
    if (!img) return;

    const { width, height } = canvas;
    if (width === 0 || height === 0) return;

    const { height: srcHeight } = usableSource(img, letterbox);
    const scale = scaleForFrame(
      img.width,
      srcHeight,
      width,
      height,
      minVisibleWidth,
    );
    const sampled = sampleTopEdgeColor(img, letterbox, width, height, scale);
    if (sampled) setAmbientColor(sampled);
  }, [imagesRef, minVisibleWidth, letterbox, animate, stillFrame]);

  /** Frame que corresponde a la posición de scroll actual. */
  const frameForScroll = useCallback((): number => {
    const container = containerRef.current;
    const band = bandRef.current;
    if (!container || !band) return 0;

    const containerRect = container.getBoundingClientRect();
    const pinTravel = containerRect.height - band.getBoundingClientRect().height;
    if (pinTravel <= 0) return 0;

    // `-top` es cuánto se ha recorrido del wrapper desde que su borde superior
    // tocó el borde superior del viewport (= el momento en que la banda se fija).
    const progress = Math.min(1, Math.max(0, -containerRect.top / pinTravel));
    const eased = Math.min(progress * frameSpeed, 1);
    return Math.round(eased * (frameCount - 1));
  }, [containerRef, bandRef, frameCount, frameSpeed]);

  // Tamaño del canvas en píxeles reales (devicePixelRatio, tope 2) y redraw en
  // resize — el frame se recalcula porque el recorrido fijado depende del alto.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      // El telón no depende del tamaño de la banda ni del dpr: siempre el
      // mismo bitmap diminuto. Se fija aquí y no en el JSX para que el
      // componente que lo monta no tenga que conocer la resolución.
      const backdrop = backdropRef.current;
      if (backdrop) {
        backdrop.width = BACKDROP_WIDTH;
        backdrop.height = BACKDROP_HEIGHT;
      }

      drawFrame(animate ? frameForScroll() : stillFrame);
      syncAmbient();
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [drawFrame, frameForScroll, animate, stillFrame, syncAmbient]);

  // Primer draw en cuanto hay frames, y color ambiente inicial.
  useEffect(() => {
    if (!eagerReady) return;
    drawFrame(animate ? frameForScroll() : stillFrame);
    syncAmbient();
  }, [eagerReady, animate, drawFrame, frameForScroll, stillFrame, syncAmbient]);

  useMotionValueEvent(scrollY, "change", () => {
    if (!animate || !eagerReady) return;
    const frameIndex = frameForScroll();
    if (frameIndex !== currentFrameRef.current) {
      drawFrame(frameIndex);
    }
  });

  return { canvasRef, backdropRef, isReady: eagerReady, ambientColor };
}
