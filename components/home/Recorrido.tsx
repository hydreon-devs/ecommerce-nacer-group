"use client";

import { useRef } from "react";
import { NarrativeSection } from "@/components/home/NarrativeSection";
import { RecorridoThread } from "@/components/home/RecorridoThread";
import type { HomeSection } from "@/lib/content/home";

interface RecorridoProps {
  sections: HomeSection[];
}

/**
 * El recorrido: las secciones narrativas con el hilo pasando por en medio.
 *
 * Existe como componente propio —y de cliente— solo para tener el `ref` del
 * contenedor: `RecorridoThread` lo necesita para medir el alto total y para
 * calcular el progreso de scroll. Todo lo demás que hay dentro
 * (`NarrativeSection`) sigue siendo de servidor y se pasa como hijo ya
 * renderizado, así que el copy y las imágenes no entran al bundle.
 *
 * El contenedor es `relative` porque el hilo se pinta como capa `absolute
 * inset-y-0` encima de él.
 *
 * `data-sober-thread` marca las secciones en registro sobrio para que el hilo
 * sepa dónde aquietar la mariposa. Va aquí, en el envoltorio, y no dentro de
 * `NarrativeSection`: el hilo mide cajas, y esta es la caja completa de la
 * sección.
 *
 * Aquí dentro NO puede entrar nada de ancho completo con contenido centrado.
 * La banda editorial del cierre vive después del recorrido, en `app/page.tsx`:
 * si entrara aquí, el hilo —que es una capa `absolute`— cruzaría por encima de
 * su contenido y rompería el cambio de ritmo entre relato y conversión.
 */
export function Recorrido({ sections }: RecorridoProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative">
      <RecorridoThread containerRef={containerRef} />

      {sections.map((section) => (
        <div
          key={section.id}
          data-sober-thread={section.sober ? "" : undefined}
        >
          <NarrativeSection section={section} />
        </div>
      ))}
    </div>
  );
}
