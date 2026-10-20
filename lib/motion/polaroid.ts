/**
 * Movimiento de una polaroid de la sección de ocasiones. Valores tomados del
 * módulo "Polaroid Footer" de Framer. 350 ms, dentro de la ventana de
 * 150–400 ms de `nacer-motion`.
 *
 * Con reduced motion la tarjeta conserva su inclinación estática y no hay
 * transformación en hover (`hover` queda `undefined`).
 */
export function polaroidMotion(tilt: number, reducedMotion: boolean) {
  return {
    rest: { rotate: tilt },
    hover: reducedMotion
      ? undefined
      : { rotate: 0, y: -18, scale: 1.04 },
    transition: { type: "spring" as const, duration: 0.35, bounce: 0.25 },
  };
}
