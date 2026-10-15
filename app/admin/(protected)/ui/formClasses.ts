/**
 * Clases compartidas de los controles de formulario del panel.
 * 44px de alto (objetivo táctil), 16px en móvil (evita el zoom de iOS al
 * enfocar), borde visible (contraste 3:1) y anillo de foco con el acento.
 */
const CONTROL =
  "min-h-11 rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-base text-admin-ink transition-colors duration-200 placeholder:text-admin-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent aria-[invalid=true]:border-admin-critical-fg disabled:opacity-60 sm:text-sm";

export const inputClass = CONTROL;
export const selectClass = CONTROL;
export const labelClass = "text-sm font-medium text-admin-ink-secondary";
export const helpTextClass = "text-xs text-admin-ink-muted";
export const errorTextClass = "text-xs text-admin-critical-fg";
export const primaryButtonClass =
  "min-h-11 rounded-lg bg-admin-accent px-4 py-2 text-sm font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:opacity-60";
export const secondaryButtonClass =
  "min-h-11 rounded-lg border border-admin-border bg-admin-surface-raised px-3 py-2 text-sm font-medium text-admin-ink-secondary transition-colors duration-150 hover:border-admin-border-strong hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:opacity-60";

/** Anillo de foco compartido para enlaces y botones que no son de formulario. */
export const focusRingClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent";
/** Chip de filtro (píldora de 44px); el activo se marca además con `aria-current`. */
export function chipClass(active: boolean): string {
  return `inline-flex min-h-11 items-center rounded-full px-3 text-sm transition-colors duration-200 ${focusRingClass} ${
    active
      ? "bg-admin-accent text-admin-accent-ink"
      : "bg-admin-surface-raised text-admin-ink-secondary ring-1 ring-admin-border hover:bg-admin-surface-sunken"
  }`;
}

/** Grupo de campos de un formulario largo (tarjeta con sombra mínima). */
export const fieldsetClass =
  "flex flex-col gap-4 rounded-xl border border-admin-border bg-admin-surface-raised p-4 shadow-[0_1px_2px_rgba(11,17,32,0.04)]";

/** Base de los botones compactos de diálogos (sin color: se le suma el tono). */
export const dialogButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:opacity-60";
