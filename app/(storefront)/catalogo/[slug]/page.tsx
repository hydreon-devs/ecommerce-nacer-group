import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DisponibilidadBadge } from "@/components/catalogo/DisponibilidadBadge";
import { OcasionTags } from "@/components/producto/OcasionTags";
import { ProductGallery } from "@/components/producto/ProductGallery";
import { WhatsAppCTA } from "@/components/producto/WhatsAppCTA";
import { formatCop } from "@/lib/format";
import { getProductBySlug, PRODUCTS } from "@/lib/data/products";

interface ProductoPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return PRODUCTS.map((producto) => ({ slug: producto.slug }));
}

export async function generateMetadata({
  params,
}: ProductoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const producto = getProductBySlug(slug);
  return { title: producto ? `${producto.nombre} — Crisálidas y Mariposas` : "Producto no encontrado" };
}

/**
 * Ficha de producto. Server component: galería, tags y CTA de WhatsApp son
 * las únicas hojas de cliente (animación / interacción puntual).
 */
export default async function ProductoPage({ params }: ProductoPageProps) {
  const { slug } = await params;
  const producto = getProductBySlug(slug);

  if (!producto) notFound();

  return (
    <main className="flex flex-1 flex-col px-6 pt-32 pb-16 md:px-16 md:pt-40 md:pb-24">
      <div className="mx-auto grid w-full max-w-5xl gap-12 md:grid-cols-2">
        <ProductGallery producto={producto} />

        <div className="flex flex-col gap-6">
          <Link
            href="/catalogo"
            className="font-body text-sm text-ink/60 transition-colors hover:text-ink"
          >
            ← Volver al catálogo
          </Link>

          <div>
            <p className="font-body text-xs uppercase tracking-wide text-ink/50">
              {producto.categoria} · {producto.sku}
            </p>
            <h1 className="font-display mt-2 text-4xl leading-tight text-ink md:text-5xl">
              {producto.nombre}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display text-2xl text-ink">
              {formatCop(producto.precioCop)}
            </span>
            <DisponibilidadBadge producto={producto} />
            {producto.esPiezaUnica && (
              <span className="inline-flex items-center rounded-full bg-violet/15 px-3 py-1 font-body text-xs text-violet">
                Pieza única
              </span>
            )}
          </div>

          <p className="font-body text-ink/75">{producto.descripcionLarga}</p>

          {producto.requiereAgenda && (
            <p className="font-body text-sm text-ink/60">
              Esta experiencia requiere agendar una fecha — la coordinamos
              contigo por WhatsApp, no hay dirección de envío que dar.
            </p>
          )}

          <OcasionTags ocasiones={producto.ocasiones} />

          <div className="mt-4">
            <WhatsAppCTA producto={producto} />
          </div>
        </div>
      </div>
    </main>
  );
}
