import { FeaturedCarousel } from "@/components/home/FeaturedCarousel";
import { NarrativeSection } from "@/components/home/NarrativeSection";
import { Recorrido } from "@/components/home/Recorrido";
import { TrustPrinciples } from "@/components/home/TrustPrinciples";
import { ValueProps } from "@/components/home/ValueProps";
import { HeroIntro } from "@/components/hero/HeroIntro";
import { HeroSection } from "@/components/hero/HeroSection";
import { HOME_PRINCIPLES, HOME_SECTIONS } from "@/lib/content/home";
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
 * Orden: intro + banda de video (zona oscura) → destacados → propuesta de
 * valor → recorrido con el hilo → cifras → cierre. Todo lo que sigue al hero va
 * sobre fondo claro.
 *
 * Los destacados van pegados al video a propósito: son el único bloque del
 * Home que lleva a comprar, y quien llega hasta el final de la banda ya invirtió
 * scroll suficiente como para merecer producto y no otra sección de discurso.
 */
export default function Home() {
  const destacados = getFeaturedProducts();

  // El recorrido son las secciones con imagen; el hilo pasa por ellas y termina
  // donde termina el relato. El cierre (`cta-final`) queda fuera a propósito:
  // es el destino, no una parada más, y dejar que el hilo lo cruzara le pondría
  // un trazo por detrás del botón.
  const recorrido = HOME_SECTIONS.filter((section) => section.image);
  const cierre = HOME_SECTIONS.filter((section) => !section.image);

  return (
    <main className="flex flex-1 flex-col">
      <HeroSection>
        <HeroIntro />
      </HeroSection>

      <FeaturedCarousel productos={destacados} />

      <ValueProps />

      <Recorrido sections={recorrido} />

      <TrustPrinciples principles={HOME_PRINCIPLES} />

      {cierre.map((section) => (
        <NarrativeSection key={section.id} section={section} />
      ))}
    </main>
  );
}
