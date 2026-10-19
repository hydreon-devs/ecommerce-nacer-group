import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/catalogo/ProductCard";
import { ProductGallery } from "@/components/producto/ProductGallery";
import { ProductPurchase } from "@/components/producto/ProductPurchase";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  getRelatedProducts,
  getStorefrontProductBySlug,
} from "@/lib/data/storefront-products";

interface ProductoPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Sin `generateStaticParams`: el catálogo vive en la DB y cambia sin deploy.
 * Con `dynamicParams` (por defecto) cada ficha se renderiza en su primera visita
 * y queda cacheada; el dato mismo se revalida cada 5 min en
 * `storefront-products.ts`. Un slug inexistente cae en `notFound()`.
 */
export async function generateMetadata({
  params,
}: ProductoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const producto = await getStorefrontProductBySlug(slug);
  if (!producto) return { title: "Producto no encontrado" };
  return {
    title: `${producto.nombre} — Crisálidas y Mariposas`,
    description: producto.descripcion ?? undefined,
  };
}

/**
 * Ficha de producto. Server component: la galería y `ProductPurchase`
 * (variante, precio, adicionales, CTA) son las únicas hojas de cliente.
 */
export default async function ProductoPage({ params }: ProductoPageProps) {
  const { slug } = await params;
  const producto = await getStorefrontProductBySlug(slug);

  if (!producto) notFound();
  const relacionados = await getRelatedProducts(producto);

  return (
    <main className="flex flex-1 flex-col px-6 pt-32 pb-16 md:px-16 md:pt-40 md:pb-24">
      <div className="mx-auto w-full max-w-6xl">
        {/* Arriba del todo (no debajo de la galería en móvil): es lo primero
            que se busca para volver, y mide 44px de alto. */}
        <Link
          href="/catalogo"
          className="-ms-1 mb-6 inline-flex min-h-11 items-center gap-1 rounded-full pe-3 font-body text-sm text-ink-muted transition-colors duration-150 ease-out hover:text-ink motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
        >
          <ChevronLeftIcon width={18} height={18} />
          Volver al catálogo
        </Link>

        <div className="grid gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
          {/* La galería acompaña el scroll mientras se lee la ficha y se elige variante. */}
          <div className="md:sticky md:top-28 md:self-start">
            <ProductGallery producto={producto} />
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <p className="font-body text-xs uppercase tracking-wide text-ink-muted">
                <Link
                  href={`/catalogo?coleccion=${producto.coleccionSlug}`}
                  className="inline-flex min-h-11 items-center underline-offset-4 transition-colors duration-150 ease-out hover:text-ink hover:underline motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
                >
                  {producto.coleccion}
                </Link>
              </p>
              <h1 className="font-display text-4xl leading-tight text-ink md:text-5xl">
                {producto.nombre}
              </h1>
            </div>

            {producto.descripcion && (
              <p className="font-body text-ink/80">{producto.descripcion}</p>
            )}

            {producto.simbolismo && (
              <div className="rounded-xl bg-cream-soft/60 p-4">
                <h2 className="font-body text-xs uppercase tracking-wide text-ink-muted">
                  Simbolismo
                </h2>
                <p className="font-body mt-2 text-ink/80">{producto.simbolismo}</p>
              </div>
            )}

            <ProductPurchase producto={producto} />
          </div>
        </div>
      </div>

      {relacionados.length > 0 && (
        <section
          aria-labelledby="relacionados-titulo"
          className="mx-auto mt-24 w-full max-w-6xl border-t border-ink/10 pt-16"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionLabel>Recomendados</SectionLabel>
              <h2
                id="relacionados-titulo"
                className="font-display mt-3 text-3xl text-ink md:text-4xl"
              >
                También te puede gustar
              </h2>
            </div>
            <Link
              href={`/catalogo?coleccion=${producto.coleccionSlug}`}
              className="inline-flex min-h-11 items-center gap-1 rounded-full font-body text-sm text-ink-muted transition-colors duration-150 ease-out hover:text-ink motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
            >
              Ver toda la colección
              <ChevronRightIcon width={18} height={18} />
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-6 lg:grid-cols-4">
            {relacionados.map((relacionado) => (
              <ProductCard key={relacionado.id} producto={relacionado} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
