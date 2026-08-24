"use client";

import { Chip } from "@/components/ui/Chip";

interface OcasionChipsProps {
  ocasiones: string[];
  selected: string | null;
  onSelect: (ocasion: string | null) => void;
}

/**
 * Filtro por ocasión — la dimensión principal del catálogo, por encima de
 * categoría (`nacer-dominio` §6): así es como el cliente busca ("algo para
 * condolencias"), no por tipo de objeto.
 */
export function OcasionChips({ ocasiones, selected, onSelect }: OcasionChipsProps) {
  return (
    <div
      role="group"
      aria-label="Filtrar por ocasión"
      className="flex flex-wrap gap-2"
    >
      <Chip active={selected === null} onClick={() => onSelect(null)}>
        Todas las ocasiones
      </Chip>
      {ocasiones.map((ocasion) => (
        <Chip
          key={ocasion}
          active={selected === ocasion}
          onClick={() => onSelect(selected === ocasion ? null : ocasion)}
        >
          {ocasion}
        </Chip>
      ))}
    </div>
  );
}
