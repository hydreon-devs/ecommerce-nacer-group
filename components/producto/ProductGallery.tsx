"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import type { Producto } from "@/lib/domain/types";

interface ProductGalleryProps {
  producto: Producto;
}

/**
 * Galería de producto. La primera imagen se precarga porque es candidata a LCP
 * en la ficha; las siguientes se mantienen lazy. La transición es un fundido
 * simple y se desactiva por completo con `prefers-reduced-motion`.
 */
export function ProductGallery({ producto }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const activeImage = producto.imagenes[active];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-cream-soft">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={activeImage.url}
              alt={activeImage.alt}
              fill
              preload={active === 0}
              sizes="(max-width: 767px) calc(100vw - 3rem), 40vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {producto.imagenes.length > 1 && (
        <div className="flex gap-2" role="tablist" aria-label="Galería del producto">
          {producto.imagenes.map((image, index) => (
            <button
              key={image.url}
              type="button"
              role="tab"
              aria-selected={active === index}
              aria-label={`Ver ${image.alt}`}
              onClick={() => setActive(index)}
              className={`relative h-20 flex-1 overflow-hidden rounded-lg transition-opacity motion-reduce:transition-none ${
                active === index ? "opacity-100 ring-2 ring-moss" : "opacity-50 hover:opacity-80"
              }`}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="(max-width: 767px) 30vw, 12vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
