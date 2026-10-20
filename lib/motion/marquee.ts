/** Segundos que tarda una tarjeta en avanzar su propio ancho en el marquee. */
const SECONDS_PER_CARD = 5.5;

/**
 * Duración de una vuelta completa del marquee de ocasiones. Proporcional al
 * número de tarjetas para que la velocidad no cambie al agregar o quitar una
 * ocasión: nueve tarjetas dan ~50 s, un ritmo de ambiente y no de interacción.
 */
export function marqueeDurationSeconds(cardCount: number): number {
  return Math.max(1, cardCount) * SECONDS_PER_CARD;
}
