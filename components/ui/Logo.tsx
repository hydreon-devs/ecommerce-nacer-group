import Image from "next/image";
import { SITE_NAME } from "@/lib/config";

/** Proporción del lockup vectorizado (`viewBox` 2816 × 1472). */
const LOGO_WIDTH = 2816;
const LOGO_HEIGHT = 1472;

interface LogoProps {
  /** Clases de la imagen. El alto manda; el ancho sale de la proporción. */
  className?: string;
}

/**
 * Logo de Crisálidas y Mariposas: isotipo + nombre, en el dorado de marca.
 *
 * El SVG de `public/brand/` es una vectorización (potrace) del PNG original
 * que entregó el cliente (`assets/source/images/logo-fblanco-crisalidas.png`).
 * El PNG venía en RGB sin transparencia y con mucho margen blanco, inservible
 * sobre el header translúcido; el vector no tiene fondo y escala sin pérdida.
 *
 * El color va incrustado en el SVG, no en `currentColor`: es la versión para
 * fondo claro ("fblanco") y el dorado es parte de la marca. Sobre el hero
 * oscuro también funciona sin variante propia.
 *
 * `next/image` sirve los `.svg` sin optimizar automáticamente; no hace falta
 * `dangerouslyAllowSVG`. `priority` porque vive en el header, siempre arriba.
 */
export function Logo({ className = "h-11 w-auto md:h-14" }: LogoProps) {
  return (
    <Image
      src="/brand/logo-crisalidas.svg"
      alt={SITE_NAME}
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority
      className={className}
    />
  );
}
