/**
 * Registro de heroes cinematográficos intercambiables.
 *
 * Cada entrada describe una secuencia de frames pre-extraída (ver
 * `scripts/extract-frames.sh`) y cómo mapear el progreso de scroll a un
 * índice de frame. Cuál está activo se decide en un único lugar —
 * `ACTIVE_HERO` en `lib/config.ts` — nunca en `HeroSection.tsx` ni en
 * `useCanvasScrub.ts`, que solo consumen la definición.
 *
 * `frameSpeed` multiplica el progreso del tramo fijado (`sticky`) antes de
 * mapearlo a frame (ver `useCanvasScrub`). El progreso ya está normalizado a
 * la geometría real de la banda: 0 cuando se fija, 1 cuando se suelta. Con
 * `frameSpeed = 1` la secuencia termina justo al soltarse; por encima de 1
 * termina antes y deja un remanso con el último frame. No es una propiedad
 * derivable de `frameCount` o duración — es un ajuste editorial por video,
 * verificado a ojo en `npm run dev`.
 */
export interface HeroDefinition {
  id: string;
  /** Construye la ruta pública de un frame dado su índice (0-based). */
  framePath: (index: number) => string;
  frameCount: number;
  frameSpeed: number;
  /**
   * Fracción de la secuencia (0-1) que representa mejor al video en un solo
   * cuadro: es lo que se pinta con `prefers-reduced-motion`, sin scrub.
   */
  stillAt: number;
}

export type HeroId = "vuelo" | "partida" | "emergencia";

export const HEROES: Record<HeroId, HeroDefinition> = {
  vuelo: {
    id: "vuelo",
    framePath: (index) =>
      `/frames/vuelo/frame_${String(index + 1).padStart(4, "0")}.webp`,
    frameCount: 240, // 24fps × 10s
    frameSpeed: 1.45,
    stillAt: 0.6,
  },
  partida: {
    id: "partida",
    framePath: (index) =>
      `/frames/partida/frame_${String(index + 1).padStart(4, "0")}.webp`,
    frameCount: 192, // 24fps × 8s
    // Video más corto sobre el mismo tramo de scroll (320vh): completa la
    // secuencia un poco antes que "vuelo" para dejar más aire de scroll con
    // el último frame (fondo negro, mariposa ya abierta) como telón de los
    // captions laterales que siguen al momento de marca.
    frameSpeed: 1.65,
    stillAt: 0.6,
  },
  emergencia: {
    id: "emergencia",
    framePath: (index) =>
      `/frames/emergencia/frame_${String(index + 1).padStart(4, "0")}.webp`,
    frameCount: 192, // 24fps × 8s
    // La banda ya no es una toma de pantalla completa: el tramo fijado es
    // corto, así que la secuencia se recorre casi entera. 1.08 la termina
    // sobre el 93% del recorrido y deja un remanso mínimo con el último
    // frame (la mariposa posada) antes de soltar la banda.
    frameSpeed: 1.08,
    // Frame ~110 de 192: la monarca completamente abierta, de frente.
    stillAt: 0.57,
  },
};

export function getHero(id: HeroId): HeroDefinition {
  return HEROES[id];
}
