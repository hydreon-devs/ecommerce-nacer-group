import Link from "next/link";
import type { Ocasion } from "@/lib/domain/types";
import { Chip } from "@/components/ui/Chip";

interface OcasionTagsProps {
  ocasiones: Ocasion[];
}

/** Tags de ocasión en la ficha — cada uno enlaza de vuelta al catálogo filtrado. */
export function OcasionTags({ ocasiones }: OcasionTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ocasiones.map((ocasion) => (
        <Link key={ocasion} href={`/catalogo?ocasion=${encodeURIComponent(ocasion)}`}>
          <Chip as="span">{ocasion}</Chip>
        </Link>
      ))}
    </div>
  );
}
