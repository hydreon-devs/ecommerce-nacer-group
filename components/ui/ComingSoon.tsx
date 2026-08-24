import Link from "next/link";
import { SectionLabel } from "./SectionLabel";

interface ComingSoonProps {
  eyebrow: string;
  title: string;
  body: string;
}

/**
 * Vista mínima para rutas de contenido de marca que todavía no existen
 * (`/nosotros`, `/marca`).
 *
 * Existe por una razón concreta: el nav del header las enlaza, y un enlace del
 * nav no puede llevar a un 404. NO es contenido definitivo — cuando se escriba
 * la página real, este componente deja de usarse en esa ruta.
 */
export function ComingSoon({ eyebrow, title, body }: ComingSoonProps) {
  return (
    <main className="flex flex-1 flex-col justify-center px-6 pt-36 pb-24 md:px-16 md:pt-44 md:pb-32">
      <div className="mx-auto w-full max-w-xl text-center">
        <SectionLabel>{eyebrow}</SectionLabel>

        <h1 className="font-display mt-4 text-4xl leading-tight text-ink md:text-5xl">
          {title}
        </h1>

        <p className="font-body mt-5 text-base text-ink/70 md:text-lg">{body}</p>

        <p className="mt-8 inline-flex items-center rounded-full border border-ink/15 px-4 py-2 font-body text-xs uppercase tracking-[0.16em] text-ink/55">
          Estamos preparando esta sección
        </p>

        <div className="mt-10">
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-body text-sm text-cream transition-colors duration-200 hover:bg-ink/85"
          >
            Mientras tanto, ver el catálogo →
          </Link>
        </div>
      </div>
    </main>
  );
}
