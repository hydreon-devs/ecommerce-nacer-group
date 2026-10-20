import Image from "next/image";
import type { Brand, BrandTone } from "@/lib/content/brands";

/**
 * Piezas compartidas por la lista móvil (servidor) y el selector de escritorio
 * (cliente). Sin hooks ni estado: es markup puro. Los colores salen de los
 * tokens de `globals.css`, nunca de valores incrustados.
 */

const TONE_CLASSES: Record<BrandTone, string> = {
  moss: "bg-moss text-cream",
  violet: "bg-violet text-cream",
  amber: "bg-amber text-ink",
};

/**
 * Tarjeta de marca: visual (foto o placeholder de color) con el texto
 * superpuesto en la parte baja sobre un degradado oscuro. El texto es siempre
 * claro sobre el degradado (`ink`), así que el contraste no depende de la foto
 * ni del color del placeholder. Proporción fija: no hay CLS.
 */
export function BrandCard({
  brand,
  headingLevel = "h3",
  priority = false,
}: {
  brand: Brand;
  headingLevel?: "h3" | "p";
  priority?: boolean;
}) {
  const Heading = headingLevel;
  return (
    <div
      className={`relative aspect-[4/5] w-full overflow-hidden rounded-2xl md:aspect-[4/3] ${TONE_CLASSES[brand.tone]}`}
    >
      {brand.image && (
        <Image
          src={brand.image.src}
          alt={brand.image.alt}
          width={brand.image.width}
          height={brand.image.height}
          sizes="(min-width: 768px) 60vw, 100vw"
          priority={priority}
          className="absolute inset-0 size-full object-cover"
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-ink via-ink/90 via-75% to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start p-6 md:p-8">
        <p className="font-body text-xs uppercase tracking-[0.2em] text-cream">
          {brand.tagline}
        </p>
        <Heading className="font-display mt-2 text-2xl leading-snug text-cream md:text-3xl">
          {brand.name}
        </Heading>
        <p className="font-body mt-3 max-w-xl text-sm text-cream md:text-base">
          {brand.description}
        </p>
        <BrandCta brand={brand} />
      </div>
    </div>
  );
}

export function BrandCta({ brand }: { brand: Brand }) {
  const { link } = brand;
  if (!link) return null;

  const className =
    "mt-5 inline-flex min-h-11 items-center gap-1 rounded-full font-body text-sm font-medium text-cream underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cream";

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {link.label}
        <span className="sr-only"> (se abre en una pestaña nueva)</span>
        <span aria-hidden="true">↗</span>
      </a>
    );
  }
  return (
    <a href={link.href} className={className}>
      {link.label}
      <span aria-hidden="true">→</span>
    </a>
  );
}
