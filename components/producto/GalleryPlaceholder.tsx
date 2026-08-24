"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { Producto } from "@/lib/domain/types";

interface GalleryPlaceholderProps {
  producto: Producto;
}

const CATEGORY_GRADIENT: Record<Producto["categoria"], string> = {
  Experiencia: "from-moss/70 via-moss-soft/40 to-cream-soft",
  Artesanía: "from-amber/70 via-amber-soft/40 to-cream-soft",
  Detalle: "from-violet/60 via-violet-soft/35 to-cream-soft",
};

/**
 * Bloque de galería estilizado — Fase 1 no tiene fotografía real de
 * producto todavía. `producto.imagenes` son descripciones de lo que iría en
 * cada posición, no URLs. La transición entre "imágenes" es un fundido
 * simple (opacity), dentro del presupuesto de UI y válido incluso para
 * productos de tono sobrio.
 */
export function GalleryPlaceholder({ producto }: GalleryPlaceholderProps) {
  const [active, setActive] = useState(0);
  const gradient = CATEGORY_GRADIENT[producto.categoria];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-cream-soft">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={`absolute inset-0 flex items-end bg-gradient-to-br ${gradient} p-6`}
          >
            <p className="font-body text-sm text-ink/70">
              {producto.imagenes[active]}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {producto.imagenes.length > 1 && (
        <div className="flex gap-2" role="tablist" aria-label="Galería del producto">
          {producto.imagenes.map((label, index) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={active === index}
              onClick={() => setActive(index)}
              className={`h-16 flex-1 rounded-lg bg-gradient-to-br ${gradient} transition-opacity ${
                active === index ? "opacity-100 ring-2 ring-moss" : "opacity-50 hover:opacity-80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
