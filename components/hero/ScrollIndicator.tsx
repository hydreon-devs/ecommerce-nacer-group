interface ScrollIndicatorProps {
  className?: string;
}

/**
 * Indicador de scroll: la palabra "Scroll" y, debajo, una línea vertical
 * delgada que se desvanece hacia abajo — continuación visual del hilo del que
 * cuelga la crisálida en el video.
 *
 * Vive al final de `HeroIntro`, es decir ARRIBA de la banda de video y en
 * flujo normal de documento, apuntando hacia ella. No se dibuja encima del
 * canvas: nada lo hace.
 */
export function ScrollIndicator({ className = "" }: ScrollIndicatorProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <span className="font-body text-[10px] uppercase tracking-[0.4em] text-cream/60">
        Scroll
      </span>
      <span
        aria-hidden="true"
        className="h-9 w-px bg-gradient-to-b from-cream/50 to-transparent"
      />
    </div>
  );
}
