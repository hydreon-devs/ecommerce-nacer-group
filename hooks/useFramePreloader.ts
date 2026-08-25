"use client";

import { useEffect, useRef, useState } from "react";

interface UseFramePreloaderOptions {
  eagerCount?: number;
  /** Índice adicional que se carga en la primera fase (p. ej. el frame
   * estático de respaldo para `prefers-reduced-motion` o para móvil). */
  priorityIndex?: number;
  /**
   * Si es `false`, se carga la fase eager y nada más.
   *
   * Es lo que evita descargar la secuencia entera donde no hay scrub que
   * alimentar: en móvil el hero es una imagen fija, así que bajar 192 WebP
   * sería gastar los datos del usuario en frames que nadie va a ver. Con
   * `eagerCount: 0` y un `priorityIndex`, se baja exactamente una imagen.
   */
  loadAll?: boolean;
}

interface UseFramePreloaderResult {
  /** Ref mutable — no dispara render en cada frame cargado, solo se lee en el draw loop. */
  imagesRef: React.RefObject<(HTMLImageElement | null)[]>;
  /** true cuando la fase 1 (eager) terminó: ya se puede empezar a dibujar. */
  eagerReady: boolean;
}

/**
 * Precarga los frames del hero en dos fases:
 * 1. Eager — los primeros `eagerCount` frames (+ `priorityIndex`), bloqueante
 *    para el primer draw.
 * 2. Background — el resto, secuencial, sin bloquear el hilo principal. Solo
 *    si `loadAll`.
 *
 * `priorityIndex` es un número y no una lista a propósito: entra en el array de
 * dependencias del efecto, y una lista nueva en cada render lo re-dispararía.
 * Ese array TIENE que ser correcto porque `loadAll` cambia después de montar
 * (el valor de `useMediaQuery` llega en el commit): si el efecto no se
 * re-ejecutara al pasar a `true`, el escritorio se quedaría con la única imagen
 * que bajó creyéndose móvil y el scrub no tendría frames.
 */
export function useFramePreloader(
  frameCount: number,
  framePath: (index: number) => string,
  {
    eagerCount = 10,
    priorityIndex,
    loadAll = true,
  }: UseFramePreloaderOptions = {},
): UseFramePreloaderResult {
  const imagesRef = useRef<(HTMLImageElement | null)[]>(
    new Array(frameCount).fill(null),
  );

  /**
   * Qué configuración terminó su fase eager, no un booleano suelto.
   *
   * `eagerReady` se deriva comparándola con la configuración actual, así que
   * cambiar de parámetros la invalida durante el render, sin `setState` en el
   * cuerpo del efecto ni renders encadenados.
   *
   * Un booleano no alcanza: al pasar de imagen fija a scrub dejaba el canvas
   * congelado. El primer render cree que no hay scrub (`useMediaQuery`
   * responde `false` en servidor), baja un frame y marca listo; cuando el media
   * query se resuelve y toca bajar la secuencia, `setEagerReady(true)` ya no
   * cambia nada, el efecto que dibuja no se vuelve a ejecutar y el frame
   * correcto no se pinta hasta el primer scroll.
   */
  const config = `${frameCount}|${eagerCount}|${priorityIndex}|${loadAll}`;
  const [readyConfig, setReadyConfig] = useState<string | null>(null);
  const eagerReady = readyConfig === config;

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
      const eagerIndices = new Set<number>();
      if (priorityIndex !== undefined) eagerIndices.add(priorityIndex);
      for (let i = 0; i < Math.min(eagerCount, frameCount); i++) {
        eagerIndices.add(i);
      }

      await Promise.all(Array.from(eagerIndices).map(loadFrame));
      if (cancelled) return;
      setReadyConfig(config);

      if (!loadAll) return;

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
  }, [config, frameCount, framePath, eagerCount, priorityIndex, loadAll]);

  return { imagesRef, eagerReady };
}
