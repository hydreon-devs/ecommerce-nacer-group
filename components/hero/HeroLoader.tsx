/**
 * Placeholder mientras carga la fase eager de frames del hero. Mismas
 * dimensiones que el canvas (inset-0), así que no produce CLS cuando el canvas
 * empieza a pintar. El pulso respeta reduced motion vía la variante
 * `motion-reduce:` de Tailwind (no depende de JS).
 *
 * El fondo es `--color-hero-ambient`, no `--color-ink`: cualquier otro color
 * dibujaría durante la carga exactamente el rectángulo que esta iteración del
 * hero existe para eliminar.
 */
export function HeroLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-hero-ambient">
      <div className="h-3 w-3 rounded-full bg-amber/70 animate-pulse motion-reduce:animate-none" />
    </div>
  );
}
