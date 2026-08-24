"use client";

import { useEffect, useRef, useState } from "react";

interface UseFramePreloaderOptions {
  eagerCount?: number;
  /** Índices adicionales que se cargan en la primera fase (p. ej. el frame
   * estático de respaldo para `prefers-reduced-motion`). */
  priorityIndices?: number[];
}

interface UseFramePreloaderResult {
  /** Ref mutable — no dispara render en cada frame cargado, solo se lee en el draw loop. */
  imagesRef: React.RefObject<(HTMLImageElement | null)[]>;
  /** true cuando la fase 1 (eager) terminó: ya se puede empezar a dibujar. */
  eagerReady: boolean;
}

/**
 * Precarga los frames del hero en dos fases:
 * 1. Eager — los primeros `eagerCount` frames (+ prioridad), bloqueante para
 *    el primer draw.
 * 2. Background — el resto, secuencial, sin bloquear el hilo principal.
 */
export function useFramePreloader(
  frameCount: number,
  framePath: (index: number) => string,
  { eagerCount = 10, priorityIndices = [] }: UseFramePreloaderOptions = {},
): UseFramePreloaderResult {
  const imagesRef = useRef<(HTMLImageElement | null)[]>(
    new Array(frameCount).fill(null),
  );
  const [eagerReady, setEagerReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const images = imagesRef.current;

    function loadFrame(index: number): Promise<void> {
      if (index < 0 || index >= frameCount) return Promise.resolve();
      if (images[index]) return Promise.resolve();
      return new Promise((resolve) => {
        const img = new window.Image();
        img.src = framePath(index);
        img.onload = () => {
          images[index] = img;
          resolve();
        };
        img.onerror = () => resolve();
      });
    }

    async function run() {
      const eagerIndices = new Set<number>(priorityIndices);
      for (let i = 0; i < Math.min(eagerCount, frameCount); i++) {
        eagerIndices.add(i);
      }

      await Promise.all(Array.from(eagerIndices).map(loadFrame));
      if (cancelled) return;
      setEagerReady(true);

      for (let i = 0; i < frameCount; i++) {
        if (cancelled) return;
        if (images[i]) continue;
        await loadFrame(i);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameCount]);

  return { imagesRef, eagerReady };
}
