"use client";

import { Chip } from "@/components/ui/Chip";
import type { ColeccionFiltro } from "@/lib/domain/types";

interface ColeccionChipsProps {
  colecciones: ColeccionFiltro[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

/**
 * Filtro por colección. Hoy es el único eje de navegación que la base de datos
 * respalda; la ocasión (`nacer-dominio` §6) volverá como filtro principal
 * cuando exista el dato `ocasiones`.
 *
 * Los chips envuelven en varias líneas (no hay fila recortada ni scroll
 * horizontal): ninguna etiqueta queda oculta y cada chip mide 44px de alto.
 */
export function ColeccionChips({ colecciones, selected, onSelect }: ColeccionChipsProps) {
  return (
    <div
      role="group"
      aria-label="Filtrar por colección"
      className="flex flex-wrap gap-2 lg:flex-col lg:items-start"
    >
      <Chip active={selected === null} onClick={() => onSelect(null)}>
        Todas
      </Chip>
      {colecciones.map((coleccion) => (
        <Chip
          key={coleccion.slug}
          active={selected === coleccion.slug}
          onClick={() => onSelect(selected === coleccion.slug ? null : coleccion.slug)}
        >
          {coleccion.nombre}
        </Chip>
      ))}
    </div>
  );
}
