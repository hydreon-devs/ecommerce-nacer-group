import type { Metadata } from "next";
import { CatalogClient } from "@/components/catalogo/CatalogClient";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  getStorefrontCollections,
  getStorefrontProducts,
} from "@/lib/data/storefront-products";

export const metadata: Metadata = {
  title: "Catálogo — Crisálidas y Mariposas",
};

interface CatalogoPageProps {
  searchParams: Promise<{ coleccion?: string }>;
}

/**
 * Server component: pasa productos + colecciones a `CatalogClient` (cliente,
 * dueño del estado del filtro). El filtro base (publicado, marca que vende,
 * variante activa) ya está resuelto en `getStorefrontProducts` — Florea no
 * entra al catálogo. Se filtra por colección porque es lo que la DB respalda;
 * la ocasión vuelve como filtro principal cuando exista el dato.
 */
export default async function CatalogoPage({ searchParams }: CatalogoPageProps) {
  const params = await searchParams;
  const [productos, colecciones] = await Promise.all([
    getStorefrontProducts(),
    getStorefrontCollections(),
  ]);
  // Un `?coleccion=` que no existe se ignora en vez de mostrar una grilla vacía.
  const initialColeccion = colecciones.some((c) => c.slug === params.coleccion)
    ? (params.coleccion ?? null)
    : null;

  return (
    <main className="flex flex-1 flex-col px-6 pt-32 pb-16 md:px-16 md:pt-40 md:pb-24">
      <div className="mx-auto w-full max-w-7xl">
        <SectionLabel>Catálogo</SectionLabel>
        <h1 className="font-display mt-3 text-4xl text-ink md:text-6xl">
          Encuentra la pieza para el momento
        </h1>
        <p className="font-body mt-4 max-w-2xl text-ink-muted">
          Explora por colección y encuentra el detalle justo, desde un pequeño
          milagro hasta una liberación de mariposas.
        </p>

        <div className="mt-10 md:mt-12">
          <CatalogClient
            productos={productos}
            colecciones={colecciones}
            initialColeccion={initialColeccion}
          />
        </div>
      </div>
    </main>
  );
}
