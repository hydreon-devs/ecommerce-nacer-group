import { OccasionsRail } from "@/components/home/OccasionsRail";
import { RevealSection } from "@/components/motion/RevealSection";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { OCCASIONS } from "@/lib/content/home";

/**
 * Ocasiones para las que se compra, como una fila de polaroids inclinadas.
 * Va justo después de "Cómo trabajamos".
 *
 * Server component: la cabecera usa `RevealSection` y las únicas hojas de
 * cliente son la fila (`OccasionsRail`) y cada `Polaroid`. Es un índice mixto
 * de ocasiones, no una ficha de producto etiquetada `condolencias`, así que el
 * registro sobrio de `nacer-motion` §2.6 no aplica aquí.
 */
export function OccasionsSection() {
  return (
    <section
      aria-labelledby="ocasiones-title"
      className="border-b border-ink/8 bg-cream-soft/45 px-6 py-20 md:px-16 md:py-28"
    >
      <div className="mx-auto w-full max-w-6xl">
        <RevealSection type="fade-up" align="left" as="div" className="max-w-2xl">
          <SectionLabel>Ocasiones</SectionLabel>
          <h2
            id="ocasiones-title"
            className="font-display mt-3 text-3xl leading-tight text-ink md:text-5xl"
          >
            Para cada momento que importa
          </h2>
        </RevealSection>

        <div className="mt-8 md:mt-10">
          <OccasionsRail occasions={OCCASIONS} />
        </div>
      </div>
    </section>
  );
}
