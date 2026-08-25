import Image from "next/image";
import Link from "next/link";
import { RevealSection } from "@/components/motion/RevealSection";
import { StaggerChild } from "@/components/motion/StaggerChild";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { HomeSection } from "@/lib/content/home";

/**
 * Una sección del recorrido narrativo del Home.
 *
 * Server component: lo único de cliente es `RevealSection` / `StaggerChild`,
 * que se renderizan como hijos. Así el copy y las imágenes salen del servidor y
 * no entran al bundle.
 *
 * Dos formas, decididas por si la sección trae `image`:
 *
 * - **Con imagen** — tres columnas desde `md`: contenido, la calle del hilo, y
 *   contenido. La columna central va vacía a propósito: es el hueco por el que
 *   pasa `RecorridoThread`, que no vive aquí dentro sino en el contenedor de
 *   todo el recorrido, porque el trazo es uno solo de arriba abajo. Su ancho
 *   (`10rem`) tiene que coincidir con el `md:w-40` del hilo; si cambia uno,
 *   cambia el otro o el trazo se sale de su calle.
 * - **Sin imagen** — bloque de texto centrado y angosto. Es el cierre
 *   (`cta-final`), que es una llamada a la acción y no un momento del relato.
 *
 * En la versión anterior `align` solo empujaba el bloque de texto a un lado y
 * lo alineaba a la derecha. Con imagen esa alineación sobra: la asimetría ya la
 * da la foto, y el cuerpo alineado a la derecha es más difícil de leer. Por eso
 * el texto va siempre alineado a la izquierda cuando hay imagen.
 *
 * Imagen y texto entran por separado, cada uno con el sesgo lateral de su lado
 * (`lateralBias`), así que cada bloque resuelve hacia donde vive. En la sección
 * sobria el sesgo se ignora solo, dentro de `RevealSection`.
 *
 * En móvil no hay columna central: el hilo corre pegado al borde izquierdo, y
 * el `pl-16` es lo que le deja sitio. Bajarlo le pasaría el texto por encima.
 *
 * ⚠️ El `w-full` de las dos `RevealSection` no es decorativo, es obligatorio.
 * `RevealSection` aplica `mx-auto`, y un ítem de grid con márgenes
 * horizontales `auto` pierde el `stretch` por defecto y pasa a `fit-content`.
 * Como la imagen usa `fill` (posición absoluta) no aporta tamaño intrínseco,
 * así que el ancho colapsaba a 0 y con él el alto del `aspect-[4/3]`: las cinco
 * imágenes desaparecían. Con `width: 100%` los márgenes `auto` resuelven a 0 y
 * la columna vuelve a ocupar su celda.
 */
export function NarrativeSection({ section }: { section: HomeSection }) {
  if (!section.image) {
    return <CenteredSection section={section} />;
  }

  const textLeft = section.align === "left";
  const textSide = textLeft ? "left" : "right";
  const imageSide = textLeft ? "right" : "left";

  return (
    <div className="py-14 pl-16 pr-6 md:px-10 md:py-20">
      {/* La imagen va primero en el DOM: apilada, entra antes que el texto y
          funciona como entrada visual de la sección. Desde `md` las columnas
          explícitas la recolocan, sin tocar el marcado. */}
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_10rem_1fr] md:items-center md:gap-0">
        <RevealSection
          as="div"
          type={section.type}
          align="center"
          sober={section.sober}
          lateralBias={imageSide}
          atCenter
          className={`w-full md:row-start-1 ${
            imageSide === "left" ? "md:col-start-1" : "md:col-start-3"
          }`}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
            <Image
              src={section.image.src}
              alt={section.image.alt}
              fill
              sizes="(min-width: 768px) 38vw, 100vw"
              className="object-cover"
            />
          </div>
        </RevealSection>

        <RevealSection
          as="div"
          type={section.type}
          align="center"
          sober={section.sober}
          lateralBias={textSide}
          atCenter
          className={`w-full text-left ${
            textSide === "left" ? "md:col-start-1" : "md:col-start-3"
          } md:row-start-1`}
        >
          <SectionLabel>{section.eyebrow}</SectionLabel>
          <h2 className="font-display mt-3 text-2xl leading-tight text-ink md:text-4xl">
            {section.title}
          </h2>
          <p className="font-body mt-4 text-sm text-ink/75 md:text-base">
            {section.body}
          </p>
          {section.cta && (
            <Link
              href={section.cta.href}
              className="mt-6 inline-flex items-center gap-2 font-body text-sm font-medium text-moss hover:underline"
            >
              {section.cta.label} →
            </Link>
          )}
        </RevealSection>
      </div>
    </div>
  );
}

/**
 * Bloque de texto sin imagen. `stagger-up` es el único `type` que escalona sus
 * hijos, así que es el único que los envuelve en `StaggerChild`; el resto
 * anima el bloque entero de una sola vez.
 */
function CenteredSection({ section }: { section: HomeSection }) {
  const staggered = section.type === "stagger-up";

  const label = <SectionLabel>{section.eyebrow}</SectionLabel>;
  const title = (
    <h2 className="font-display mt-4 text-4xl leading-tight text-ink md:text-6xl">
      {section.title}
    </h2>
  );
  const body = (
    <p className="font-body mt-6 text-base text-ink/75 md:text-lg">
      {section.body}
    </p>
  );
  const cta = section.cta && (
    <Link
      href={section.cta.href}
      className={
        staggered
          ? "mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-body text-sm text-cream transition-colors hover:bg-ink/85"
          : "mt-8 inline-flex items-center gap-2 font-body text-sm font-medium text-moss hover:underline"
      }
    >
      {section.cta.label} →
    </Link>
  );

  return (
    <RevealSection
      type={section.type}
      align={section.align}
      sober={section.sober}
      className="mx-auto max-w-xl px-6 py-24 md:px-16 md:py-32"
    >
      {staggered ? (
        <>
          <StaggerChild>{label}</StaggerChild>
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
          {cta && <StaggerChild>{cta}</StaggerChild>}
        </>
      ) : (
        <>
          {label}
          {title}
          {body}
          {cta}
        </>
      )}
    </RevealSection>
  );
}
