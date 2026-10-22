export const CHECKOUT_STEPS = ["Entrega", "Tus datos", "Resumen"] as const;

/**
 * 1 Entrega · 2 Tus datos · 3 Resumen. Only the current step is active; the
 * rest are visible but inactive (slices 3-4 build them). Below `sm` only the
 * active step shows its label so the indicator fits on one line next to the
 * page title; the other labels stay available to screen readers.
 */
export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Pasos del pedido">
      <ol className="flex items-center gap-1.5 font-body text-sm sm:gap-2">
        {CHECKOUT_STEPS.map((label, index) => {
          const step = index + 1;
          const active = step === current;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className="flex items-center gap-1.5 sm:gap-2"
            >
              <span
                className={
                  active
                    ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-moss text-xs text-cream sm:h-8 sm:w-8 sm:text-sm"
                    : "inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink/20 text-xs text-ink-muted sm:h-8 sm:w-8 sm:text-sm"
                }
              >
                {step}
              </span>
              <span
                className={
                  active ? "font-medium whitespace-nowrap text-ink" : "sr-only text-ink-muted sm:not-sr-only sm:whitespace-nowrap"
                }
              >
                {label}
                {!active && <span className="sr-only"> (aún no disponible)</span>}
              </span>
              {step < CHECKOUT_STEPS.length && (
                <span aria-hidden="true" className="h-px w-3 bg-ink/20 sm:mx-1 sm:w-6 md:w-10" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
