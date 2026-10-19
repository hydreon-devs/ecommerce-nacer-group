import Link from "next/link";
import { SectionLabel } from "./SectionLabel";

/**
 * Vista 404 del storefront. La usan dos entradas distintas:
 * - `app/(storefront)/not-found.tsx`: cuando una ruta llama a `notFound()`
 *   (p. ej. un slug de producto que no existe).
 * - `app/global-not-found.tsx`: cuando la URL no coincide con ninguna ruta.
 *
 * Sin animación propia: dentro del storefront ya entra con la transición de
 * `template.tsx`, y la global no pasa por ningún layout.
 */
export function NotFoundView() {
  return (
    <main className="flex flex-1 flex-col justify-center px-6 pt-36 pb-24 md:px-16 md:pt-44 md:pb-32">
      <div className="mx-auto w-full max-w-xl text-center">
        <p
          aria-hidden="true"
          className="font-display text-[7rem] leading-none text-ink/10 md:text-[10rem]"
        >
          404
        </p>

        <SectionLabel>Página no encontrada</SectionLabel>

        <h1 className="font-display mt-4 text-4xl leading-tight text-ink md:text-5xl">
          ¿Te perdiste un poco?
        </h1>

        <p className="font-body mt-5 text-base text-ink/70 md:text-lg">
          La página que buscas no existe o cambió de lugar. No te preocupes,
          volvamos al inicio.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-body text-sm text-cream transition-colors duration-200 hover:bg-ink/85"
          >
            Volver al inicio
          </Link>
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-6 py-3 font-body text-sm text-ink transition-colors duration-200 hover:bg-ink/5"
          >
            Ver el catálogo →
          </Link>
        </div>
      </div>
    </main>
  );
}
