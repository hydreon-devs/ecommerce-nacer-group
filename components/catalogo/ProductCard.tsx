"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Producto } from "@/lib/domain/types";
import { esOcasionSobria } from "@/lib/domain/types";
import { formatCop } from "@/lib/format";
import { cardHover, DURATION_UI, EASE_UI } from "@/components/motion/variants";
import { DisponibilidadBadge } from "./DisponibilidadBadge";

interface ProductCardProps {
  producto: Producto;
}

/**
 * Tarjeta de catálogo. `layout` + `key` estable (`producto.id`, provisto por
 * el padre) permiten que `AnimatePresence` reordene sin remount al filtrar
 * por ocasión. El hover sobrio (condolencias/acompañar/recordar) no escala
 * ni desplaza — solo cambia el color del borde.
 */
export function ProductCard({ producto }: ProductCardProps) {
  const sober = esOcasionSobria(producto.ocasiones);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: DURATION_UI, ease: EASE_UI }}
    >
      <motion.article
        initial="rest"
        whileHover="hover"
        variants={sober ? undefined : cardHover}
        className={`group h-full overflow-hidden rounded-2xl border bg-cream-soft/40 ${
          sober
            ? "border-ink/10 transition-colors duration-200 hover:border-violet/50"
            : "border-ink/10"
        }`}
      >
        <Link href={`/catalogo/${producto.slug}`} className="block h-full">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-soft">
            <Image
              src={producto.imagenes[0].url}
              alt={producto.imagenes[0].alt}
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col gap-2 p-5">
            <p className="font-body text-xs uppercase tracking-wide text-ink/50">
              {producto.categoria}
            </p>
            <h3 className="font-display text-xl leading-tight text-ink">
              {producto.nombre}
            </h3>
            <p className="font-body text-sm text-ink/70 line-clamp-2">
              {producto.descripcionCorta}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-display text-lg text-ink">
                {formatCop(producto.precioCop)}
              </span>
              <DisponibilidadBadge producto={producto} />
            </div>
          </div>
        </Link>
      </motion.article>
    </motion.div>
  );
}
