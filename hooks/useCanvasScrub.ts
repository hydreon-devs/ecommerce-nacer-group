"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { useFramePreloader } from "./useFramePreloader";

/**
 * Fallback del color ambiente mientras no haya un frame cargado. Coincide con
 * el token `--color-hero-ambient` de `globals.css` (ver la nota allí: se midió
 * de los bordes reales de los frames de `emergencia`).
 */
const FALLBACK_AMBIENT = "#110a03";

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
}

interface UseCanvasScrubResult {
  canvasRef: RefObject<HTMLCanvasElement | null>;
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
 * Color ambiente del video: promedio de las franjas izquierda y derecha a
 * media altura.
 *
 * Deliberadamente NO se muestrean las esquinas: muchos videos (este incluido)
 * traen barras negras de letterbox arriba y abajo que el modo cover recorta,
 * así que una esquina daría un negro puro que no es el color que realmente
 * toca el borde de la banda. Las franjas laterales a media altura sí son el
 * píxel que queda pegado al borde.
 */
function sampleAmbientColor(img: HTMLImageElement): string | null {
  try {
    const off = document.createElement("canvas");
    off.width = 8;
    off.height = 8;
    const ctx = off.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    const stripW = Math.max(1, Math.round(img.width * 0.03));
    const stripH = Math.max(1, Math.round(img.height * 0.2));
    const stripY = Math.round(img.height * 0.4);

    const left = averageRegion(ctx, img, 0, stripY, stripW, stripH);
    const right = averageRegion(
      ctx,
      img,
      img.width - stripW,
      stripY,
      stripW,
      stripH,
    );

    const r = Math.round((left[0] + right[0]) / 2);
    const g = Math.round((left[1] + right[1]) / 2);
    const b = Math.round((left[2] + right[2]) / 2);
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return null;
  }
}

/**
 * Scroll-scrub del hero en canvas 2D (no `<video>`: hay que poder ir cuadro a
 * cuadro con el scroll).
 *
 * Dos decisiones que vienen de un rechazo explícito de la iteración anterior:
 *
 * 1. **Cover real, sin margen.** Antes se dibujaba con un `Math.min(...) * 0.85`
 *    ("padded cover") y se rellenaba el sobrante con un color muestreado: eso
 *    es exactamente el "recuadro" que se veía. Ahora `Math.max(...)`: la imagen
 *    llena el 100% del canvas siempre y se recorta lo que sobre. Nunca hay
 *    margen que rellenar.
 * 2. **El progreso se calcula de la geometría real**, no de `useScroll({target,
 *    offset})`. Los offsets de Framer se expresan contra el alto del viewport,
 *    y la banda ya no mide un viewport (`h-[70vh] md:h-[80vh]`), así que
 *    `["start start", "end end"]` llegaría a 1 antes de que la banda se
 *    suelte y dejaría una zona muerta de (100vh - alto de banda) al final.
 *    Midiendo `container` y `band` el recorrido siempre calza exacto, en
 *    cualquier breakpoint, sin acoplar el hook a las clases de Tailwind.
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
}: UseCanvasScrubOptions): UseCanvasScrubResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ambientRef = useRef<string>(FALLBACK_AMBIENT);
  const [ambientColor, setAmbientColor] = useState<string | null>(null);
  const currentFrameRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  const stillFrame = Math.min(
    frameCount - 1,
    Math.max(0, Math.round(frameCount * stillAt)),
  );

  const { imagesRef, eagerReady } = useFramePreloader(frameCount, framePath, {
    eagerCount: 10,
    priorityIndices: [stillFrame],
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

      // Cover real: la imagen cubre el canvas entero, se recorta el sobrante.
      // El `fillRect` previo solo cubre el redondeo subpíxel del borde.
      ctx.fillStyle = ambientRef.current;
      ctx.fillRect(0, 0, width, height);

      const scale = Math.max(width / img.width, height / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      ctx.drawImage(
        img,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );

      currentFrameRef.current = index;
    },
    [imagesRef],
  );

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
      drawFrame(prefersReducedMotion ? stillFrame : frameForScroll());
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [drawFrame, frameForScroll, prefersReducedMotion, stillFrame]);

  // Primer draw en cuanto hay frames, y muestreo del color ambiente.
  useEffect(() => {
    if (!eagerReady) return;
    const source = imagesRef.current[0] ?? imagesRef.current[stillFrame];
    if (source) {
      const sampled = sampleAmbientColor(source);
      if (sampled) {
        ambientRef.current = sampled;
        setAmbientColor(sampled);
      }
    }
    drawFrame(prefersReducedMotion ? stillFrame : frameForScroll());
  }, [
    eagerReady,
    prefersReducedMotion,
    drawFrame,
    frameForScroll,
    stillFrame,
    imagesRef,
  ]);

  useMotionValueEvent(scrollY, "change", () => {
    if (prefersReducedMotion || !eagerReady) return;
    const frameIndex = frameForScroll();
    if (frameIndex !== currentFrameRef.current) {
      drawFrame(frameIndex);
    }
  });

  return { canvasRef, isReady: eagerReady, ambientColor };
}
