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
  /**
   * Fracción mínima del ancho del frame (0-1) que debe seguir visible en
   * cualquier viewport.
   *
   * Solo aplica desde `lg`, que es donde la banda ocupa el viewport entero:
   * los frames son 16:9, así que en una ventana con proporción alto/ancho por
   * encima de 0.74 un cover puro ampliaría hasta cortar las alas de la
   * mariposa. Este valor acota ese aumento. Bajo `lg` la banda toma el aspecto
   * del video y el frame entra entero, así que el tope no llega a actuar.
   *
   * Se mide sobre el frame más ancho de la secuencia: es la fracción que
   * ocupa el sujeto de borde a borde, más un margen. No se deduce del video
   * — hay que mirarlo.
   */
  minVisibleWidth: number;
  /**
   * Fracción del alto (0-1) que ocupa la barra negra de letterbox del video,
   * arriba y abajo. Se recorta en origen antes de dibujar.
   *
   * No es cosmético: si la barra llega al borde superior de la banda pinta una
   * línea negra dura contra el fondo del intro, y además deja un salto
   * negro→viñeta dentro del propio video. Medido con `magick` sobre un frame
   * real de cada secuencia; 0 si el video no tiene barras.
   */
  letterbox: number;
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
    // Envergadura medida en el frame 144: x ∈ [175, 1100] de 1280 → 0.72.
    minVisibleWidth: 0.8,
    // El bosque llega a los bordes: no hay barras.
    letterbox: 0,
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
    // Envergadura medida en el frame 115: x ∈ [205, 1090] de 1280 → 0.69.
    minVisibleWidth: 0.76,
    // Barras de 10px arriba y abajo de 720.
    letterbox: 0.014,
  },
  emergencia: {
    id: "emergencia",
    framePath: (index) =>
      `/frames/emergencia/frame_${String(index + 1).padStart(4, "0")}.webp`,
    frameCount: 192, // 24fps × 8s
    // 1.08 termina la secuencia sobre el 93% del recorrido fijado y deja un
    // remanso con el último frame (la mariposa ya abierta) antes de soltar
    // la banda. `frameSpeed` se aplica al progreso ya normalizado, así que
    // este 93% no cambia aunque cambie el alto del tramo fijado.
    frameSpeed: 1.08,
    // Frame ~110 de 192: la monarca completamente abierta, de frente.
    stillAt: 0.57,
    // Envergadura medida en el frame 110: x ∈ [200, 1100] de 1280 → 0.70.
    minVisibleWidth: 0.76,
    // Barras de 11px arriba y 10 abajo de 720.
    letterbox: 0.016,
  },
};

export function getHero(id: HeroId): HeroDefinition {
  return HEROES[id];
}
