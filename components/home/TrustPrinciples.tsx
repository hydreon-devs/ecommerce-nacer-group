import { RevealSection } from "@/components/motion/RevealSection";
import { StaggerChild } from "@/components/motion/StaggerChild";
import type { HomePrinciple } from "@/lib/content/home";

interface TrustPrinciplesProps {
  principles: HomePrinciple[];
}

/**
 * Puente editorial entre el recorrido y el CTA final.
 *
 * El fondo vive fuera de `RevealSection` a propósito: la sección conserva su
 * presencia y su contraste incluso antes de que el contenido entre en
 * viewport. Así el movimiento es una mejora progresiva, nunca una condición
 * para poder leer el bloque.
 */
export function TrustPrinciples({ principles }: TrustPrinciplesProps) {
  return (
    <section
      aria-labelledby="trust-principles-title"
      className="relative w-full overflow-hidden bg-ink text-cream"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-64 size-[34rem] rounded-full border border-amber/15 md:-right-24 md:size-[42rem]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-72 -left-56 size-[34rem] rounded-full border border-cream/8 md:size-[46rem]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-16 px-6 py-24 md:px-16 md:py-32 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
        <RevealSection
          as="div"
          type="fade-up"
          align="left"
          className="w-full lg:pr-4"
        >
          <p className="font-body text-xs uppercase tracking-[0.2em] text-amber md:text-sm">
            Lo importante antes de elegir
          </p>
          <h2
            id="trust-principles-title"
            className="font-display mt-5 text-4xl leading-[0.98] text-cream md:text-6xl"
          >
            Una forma más honesta de encontrar algo significativo.
          </h2>
          <p className="font-body mt-7 max-w-md text-base leading-relaxed text-cream/65">
            Cada producto te dice para qué momento fue pensado, cómo se
            prepara y cuándo necesita que coordinemos contigo.
          </p>
        </RevealSection>

        <RevealSection
          as="div"
          type="stagger-up"
          align="left"
          className="w-full border-b border-cream/15"
        >
          {principles.map((principle) => (
            <StaggerChild key={principle.id}>
              <article className="grid gap-4 border-t border-cream/15 py-8 sm:grid-cols-[4rem_1fr] sm:gap-6 md:py-9">
                <span className="font-display text-3xl leading-none text-amber md:text-4xl">
                  {principle.numeral}
                </span>
                <div>
                  <h3 className="font-display text-2xl leading-tight text-cream md:text-3xl">
                    {principle.title}
                  </h3>
                  <p className="font-body mt-3 max-w-xl text-sm leading-relaxed text-cream/65 md:text-base">
                    {principle.body}
                  </p>
                </div>
              </article>
            </StaggerChild>
          ))}
        </RevealSection>
      </div>
    </section>
  );
}
