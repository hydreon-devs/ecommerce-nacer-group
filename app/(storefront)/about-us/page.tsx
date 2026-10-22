import type { Metadata } from "next";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  ABOUT_BENEFITS,
  ABOUT_BENEFITS_TITLE,
  ABOUT_INTRO,
  ABOUT_TEAM,
} from "@/lib/content/about";

export const metadata: Metadata = {
  title: "Nosotros — Crisálidas y Mariposas",
};

/**
 * Página "Nosotros" canónica. El slug `/about-us` viene del sitio Odoo
 * anterior y se conserva para no perder enlaces ni posicionamiento.
 * El carrusel de equipo del sitio anterior se omitió: no hay fotos todavía.
 */
export default function AboutPage() {
  return (
    <main className="flex-1 px-6 pt-36 pb-24 md:px-16 md:pt-44 md:pb-32">
      <div className="mx-auto w-full max-w-5xl">
        <SectionLabel>Nosotros</SectionLabel>

        <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-16">
          {ABOUT_INTRO.map((block, index) => (
            <section key={block.heading}>
              {index === 0 ? (
                <h1 className="font-display text-4xl leading-tight text-ink md:text-5xl">
                  {block.heading}
                </h1>
              ) : (
                <h2 className="font-display text-4xl leading-tight text-ink md:text-5xl">
                  {block.heading}
                </h2>
              )}
              <p className="font-body mt-5 text-base leading-relaxed text-ink/80 md:text-lg">
                {block.body}
              </p>
            </section>
          ))}
        </div>

        <section className="mt-20 md:mt-28">
          <h2 className="font-display text-3xl leading-tight text-ink md:text-4xl">
            {ABOUT_BENEFITS_TITLE}
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ABOUT_BENEFITS.map((benefit) => (
              <li
                key={benefit.heading}
                className="rounded-2xl border border-ink/10 bg-cream-soft p-6"
              >
                <h3 className="font-display text-lg leading-snug text-ink">
                  {benefit.heading}
                </h3>
                <p className="font-body mt-3 text-sm leading-relaxed text-ink/75">
                  {benefit.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20 max-w-3xl md:mt-28">
          <h2 className="font-display text-3xl leading-tight text-ink md:text-4xl">
            {ABOUT_TEAM.title}
          </h2>
          <div className="mt-5 space-y-4">
            {ABOUT_TEAM.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="font-body text-base leading-relaxed text-ink/80 md:text-lg"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <div className="mt-14">
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-body text-sm text-cream transition-colors duration-200 hover:bg-ink/85"
          >
            Ver el catálogo →
          </Link>
        </div>
      </div>
    </main>
  );
}
