export interface ErrorSummaryItem {
  field: string;
  /** Ancla al control (`#id`) o null si el campo no tiene destino enfocable. */
  href: string | null;
  text: string;
}

export interface FieldTarget {
  id: string;
  label: string;
}

/** Lista del resumen de errores de un formulario largo, en el orden de los errores. */
export function buildErrorSummary(
  errors: Record<string, string>,
  resolve: (field: string) => FieldTarget | null,
): ErrorSummaryItem[] {
  return Object.entries(errors).map(([field, message]) => {
    const target = resolve(field);
    return target
      ? { field, href: `#${target.id}`, text: `${target.label}: ${message}` }
      : { field, href: null, text: message };
  });
}
