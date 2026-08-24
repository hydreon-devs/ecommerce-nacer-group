import type { Metadata } from "next";
import { CatalogClient } from "@/components/catalogo/CatalogClient";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { getAllOcasiones, PRODUCTS } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "Catálogo — Crisálidas y Mariposas",
};

interface CatalogoPageProps {
  searchParams: Promise<{ ocasion?: string }>;
}

/**
 * Server component: pasa productos + ocasiones a `CatalogClient` (cliente,
 * dueño del estado del filtro). El filtro base marca-vende-en-sitio ya está
 * resuelto en `PRODUCTS` — Fase 1 solo trabaja con la marca que vende en el
 * sitio, no hay mezcla con Florea.
 */
export default async function CatalogoPage({ searchParams }: CatalogoPageProps) {
  const params = await searchParams;
  const initialOcasion = params.ocasion ?? null;
  const ocasiones = getAllOcasiones();

  return (
    <main className="flex flex-1 flex-col px-6 pt-32 pb-16 md:px-16 md:pt-40 md:pb-24">
      <div className="mx-auto w-full max-w-6xl">
        <SectionLabel>Catálogo</SectionLabel>
        <h1 className="font-display mt-3 text-4xl text-ink md:text-6xl">
          Encuentra la pieza para el momento
        </h1>
        <p className="font-body mt-4 max-w-2xl text-ink/70">
          Filtra por ocasión — así es como solemos buscar: &quot;algo para
          condolencias&quot;, no &quot;una artesanía&quot;.
        </p>

        <div className="mt-12">
          <CatalogClient
            productos={PRODUCTS}
            ocasiones={ocasiones}
            initialOcasion={initialOcasion}
          />
        </div>
      </div>
    </main>
  );
}
