import { BrandCard } from "@/components/home/brands/BrandPanel";
import { BrandSwitcher } from "@/components/home/brands/BrandSwitcher";
import { RevealSection } from "@/components/motion/RevealSection";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { BRANDS, NACER_GROUP_INTRO } from "@/lib/content/brands";

/**
 * "Nuestras marcas": las tres marcas de Nacer Group, justo después del hero.
 *
 * Server component. Escritorio (md+) usa `BrandSwitcher`, la única hoja de
 * cliente (estado del tab activo); móvil es una pila de tarjetas sin
 * dependencia de hover. Ambas variantes se renderizan y se alterna con CSS
 * (`hidden`/`md:grid`), de modo que lo oculto no entra al árbol de
 * accesibilidad.
 *
 * Florea solo enlaza fuera; Jagua solo se presenta. Ver `lib/content/brands`.
 */
export function BrandsSection() {
  return (
    <section
      aria-labelledby="brands-heading"
      className="border-b border-ink/8 bg-cream px-6 py-20 md:px-16 md:py-28"
    >
      <div className="mx-auto w-full max-w-6xl">
        <RevealSection type="fade-up" align="center" as="div" className="max-w-2xl">
          <SectionLabel>Nacer Group</SectionLabel>
          <h2
            id="brands-heading"
            className="font-display mt-3 text-3xl leading-tight text-ink md:text-5xl"
          >
            Nuestras marcas
          </h2>
          <p className="font-body mx-auto mt-4 max-w-2xl text-base text-ink-muted md:text-lg">
            {NACER_GROUP_INTRO}
          </p>
        </RevealSection>

        <div className="mt-12 hidden md:mt-16 md:block">
          <BrandSwitcher brands={BRANDS} />
        </div>

        <ul className="mt-12 flex flex-col gap-10 md:hidden">
          {BRANDS.map((brand) => (
            <li key={brand.id}>
              <BrandCard brand={brand} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
