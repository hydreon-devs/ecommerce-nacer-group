/**
 * Marcador cuando un producto no tiene imágenes. Ocupa el mismo contenedor
 * (`absolute inset-0`) que `next/image` con `fill`, así que no cambia el layout
 * ni introduce CLS.
 */
export function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={`${label} (sin imagen)`}
      className="absolute inset-0 flex items-center justify-center bg-cream-soft"
    >
      <svg
        viewBox="0 0 48 48"
        className="h-10 w-10 text-ink/20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M24 14v22M24 20c-4-8-12-8-14-3s2 9 14 3zM24 20c4-8 12-8 14-3s-2 9-14 3z" />
      </svg>
    </div>
  );
}
