import { RevealSection } from "@/components/motion/RevealSection";
import { StaggerChild } from "@/components/motion/StaggerChild";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { VALUE_PROPS } from "@/lib/content/home";

/**
 * Franja de propuesta de valor: primera sección después de la banda de video,
 * y el punto donde la página pasa de la zona oscura del hero al fondo claro.
 *
 * Server component salvo por las envolturas de reveal (`RevealSection` /
 * `StaggerChild`, que sí son de cliente). La grilla tiene alturas naturales
 * fijas y solo anima `opacity`/`transform`, así que el escalonado no puede
 * introducir CLS.
 */
export function ValueProps() {
  return (
    <section className="border-b border-ink/8 bg-cream px-6 py-20 md:px-16 md:py-28">
      <div className="mx-auto w-full max-w-6xl">
        <RevealSection type="fade-up" align="left" as="div" className="max-w-2xl">
          <SectionLabel>Cómo trabajamos</SectionLabel>
          <h2 className="font-display mt-3 text-3xl leading-tight text-ink md:text-5xl">
            Lo que hay detrás de cada pieza
          </h2>
        </RevealSection>

        <RevealSection
          type="stagger-up"
          align="center"
          as="div"
          className="mt-12 md:mt-16"
        >
          {/* La grilla va anidada, no en el propio `RevealSection`: ese
              componente impone su propia alineación de texto según `align`, y
              aquí las cuatro columnas siempre van a la izquierda. */}
          <div className="grid grid-cols-1 gap-x-10 gap-y-10 text-left md:grid-cols-2 lg:grid-cols-4">
            {VALUE_PROPS.map((prop) => (
              <StaggerChild key={prop.id} className="flex flex-col">
                <span
                  aria-hidden="true"
                  className="font-display text-2xl text-amber md:text-3xl"
                >
                  {prop.numeral}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-4 block h-px w-10 bg-ink/15"
                />
                <h3 className="font-display mt-5 text-xl leading-snug text-ink md:text-2xl">
                  {prop.title}
                </h3>
                <p className="font-body mt-3 text-sm text-ink/70 md:text-base">
                  {prop.body}
                </p>
              </StaggerChild>
            ))}
          </div>
        </RevealSection>
      </div>
    </section>
  );
}
