import { SITE_NAME } from "@/lib/config";

interface LogoProps {
  /** Clases del contenedor. El color se hereda: el SVG pinta en `currentColor`. */
  className?: string;
  /** Acompaña la marca gráfica con el nombre escrito. */
  withWordmark?: boolean;
}

/**
 * ⚠️ MARCA GRÁFICA PROVISIONAL. La identidad visual de Crisálidas y Mariposas
 * (logo, paleta, tipografías) está pendiente del cliente. Esto es un
 * marcador de posición dibujado en SVG inline, no el logo real.
 *
 * Está aislado en un componente propio precisamente para que reemplazarlo sea
 * cambiar este archivo por un `<Image src="/logo.svg" />` (o el SVG real) sin
 * tocar el header ni ningún consumidor. Pinta en `currentColor` a propósito:
 * el header lo usa en crema sobre el hero y en tinta sobre fondo claro con el
 * mismo markup, sin variantes de color incrustadas aquí.
 *
 * El trazo superior es el hilo del que cuelga la crisálida en el video del
 * hero — el gesto que une la marca con la pieza visual de la portada.
 */
export function Logo({ className = "", withWordmark = false }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        className="h-7 w-7 shrink-0 md:h-8 md:w-8"
        aria-hidden="true"
        focusable="false"
      >
        {/* Hilo */}
        <path
          d="M16 1.5 V 9.5"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.45"
          fill="none"
        />
        {/* Antenas */}
        <g
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.7"
          fill="none"
        >
          <path d="M16 11.5 C 14.8 8.6, 13 7.2, 11.4 6.8" />
          <path d="M16 11.5 C 17.2 8.6, 19 7.2, 20.6 6.8" />
        </g>
        {/* Alas */}
        <g fill="currentColor">
          <path d="M15.1 12.4 C 9.4 6.6, 3.4 7.6, 3.4 12.6 C 3.4 17.4, 9.4 17.4, 15.1 16.2 Z" />
          <path d="M15.1 17.4 C 10.2 18.4, 5.4 20.2, 6.4 24.1 C 7.4 27.2, 13.2 25.2, 15.1 21.2 Z" />
          <path d="M16.9 12.4 C 22.6 6.6, 28.6 7.6, 28.6 12.6 C 28.6 17.4, 22.6 17.4, 16.9 16.2 Z" />
          <path d="M16.9 17.4 C 21.8 18.4, 26.6 20.2, 25.6 24.1 C 24.6 27.2, 18.8 25.2, 16.9 21.2 Z" />
        </g>
        {/* Cuerpo */}
        <ellipse cx="16" cy="17.6" rx="1.15" ry="5.6" fill="currentColor" />
      </svg>

      {withWordmark && (
        <span className="font-display text-base leading-none tracking-tight md:text-lg">
          {SITE_NAME}
        </span>
      )}
    </span>
  );
}
