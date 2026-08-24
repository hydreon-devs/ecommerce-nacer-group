import Link from "next/link";
import { FeaturedCarousel } from "@/components/home/FeaturedCarousel";
import { ValueProps } from "@/components/home/ValueProps";
import { HeroIntro } from "@/components/hero/HeroIntro";
import { HeroSection } from "@/components/hero/HeroSection";
import { RevealSection } from "@/components/motion/RevealSection";
import { StaggerChild } from "@/components/motion/StaggerChild";
import { StatsOverlay } from "@/components/motion/StatsOverlay";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { HOME_SECTIONS, HOME_STATS } from "@/lib/content/home";
import { getFeaturedProducts } from "@/lib/data/products";

/**
 * Home. Server component: las únicas hojas de cliente son la banda del hero
 * (`HeroSection`, que hace el scrub en canvas), el carrusel (estado de scroll)
 * y las envolturas de reveal.
 *
 * `HeroIntro` se pasa como `children` de `HeroSection` a propósito: así el
 * titular y el botón de catálogo se renderizan en el servidor —son el
 * candidato a LCP— aunque el contenedor que los envuelve sea de cliente. Ese
 * anidamiento es también lo que permite que el intro y la banda de video
 * compartan exactamente el mismo color de fondo, sin costura entre los dos.
 *
 * Orden: intro + banda de video (zona oscura) → propuesta de valor →
 * destacados → secciones narrativas → cifras → cierre. Todo lo que sigue al
 * hero va sobre fondo claro.
 */
export default function Home() {
  const destacados = getFeaturedProducts();

  return (
    <main className="flex flex-1 flex-col">
      <HeroSection>
        <HeroIntro />
      </HeroSection>

      <ValueProps />

      <FeaturedCarousel productos={destacados} />

      <div className="flex flex-col">
        {HOME_SECTIONS.map((section) => (
          <div key={section.id}>
            <RevealSection
              type={section.type}
              align={section.align}
              sober={section.sober}
              className="mx-auto max-w-xl px-6 py-24 md:px-16 md:py-32"
            >
              {section.type === "stagger-up" ? (
                <>
                  <StaggerChild>
                    <SectionLabel>{section.eyebrow}</SectionLabel>
                  </StaggerChild>
                  <StaggerChild
                    as="h2"
                    className="font-display mt-4 text-4xl leading-tight text-ink md:text-6xl"
                  >
                    {section.title}
                  </StaggerChild>
                  <StaggerChild
                    as="p"
                    className="font-body mt-6 text-base text-ink/75 md:text-lg"
                  >
                    {section.body}
                  </StaggerChild>
                  {section.cta && (
                    <StaggerChild>
                      <Link
                        href={section.cta.href}
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-body text-sm text-cream transition-colors hover:bg-ink/85"
                      >
                        {section.cta.label} →
                      </Link>
                    </StaggerChild>
                  )}
                </>
              ) : (
                <>
                  <SectionLabel>{section.eyebrow}</SectionLabel>
                  <h2 className="font-display mt-4 text-4xl leading-tight text-ink md:text-6xl">
                    {section.title}
                  </h2>
                  <p className="font-body mt-6 text-base text-ink/75 md:text-lg">
                    {section.body}
                  </p>
                  {section.cta && (
                    <Link
                      href={section.cta.href}
                      className="mt-8 inline-flex items-center gap-2 font-body text-sm font-medium text-moss hover:underline"
                    >
                      {section.cta.label} →
                    </Link>
                  )}
                </>
              )}
            </RevealSection>

            {section.id === "taller" && <StatsOverlay stats={HOME_STATS} />}
          </div>
        ))}
      </div>
    </main>
  );
}
