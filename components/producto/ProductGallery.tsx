"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { ImagePlaceholder } from "@/components/catalogo/ImagePlaceholder";
import { DURATION_UI, EASE_UI } from "@/components/motion/variants";
import { ZoomIcon } from "@/components/ui/icons";
import type { Producto } from "@/lib/domain/types";
import { ImageLightbox } from "./ImageLightbox";

interface ProductGalleryProps {
  producto: Producto;
}

/**
 * Galería de producto. La primera imagen se precarga porque es candidata a LCP
 * en la ficha; las siguientes se mantienen lazy. La transición es un fundido
 * simple (opacidad pura, sin movimiento), así que `MotionConfig` no tiene nada
 * que quitarle bajo `prefers-reduced-motion`.
 *
 * `AnimatePresence initial={false}`: la primera imagen llega pintada desde el
 * servidor; si entrara con `opacity: 0` se retrasaría el LCP de la ficha.
 *
 * Cuadrada, fondo blanco y `object-contain`: las fotos reales son piezas altas
 * sobre blanco y en 4:3 con `object-cover` se cortaban por arriba. El espacio
 * está reservado (`aspect-square`) para que cambiar de imagen no mueva el
 * layout. Clic en la imagen principal la abre ampliada (`ImageLightbox`).
 */
export function ProductGallery({ producto }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const activeImage = producto.imagenes[active];

  if (!activeImage) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-cream-soft">
        <ImagePlaceholder label={producto.nombre} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        data-cart-source="gallery"
        onClick={() => setExpanded(active)}
        aria-label={`Ampliar ${activeImage.alt}`}
        className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl bg-white [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION_UI, ease: EASE_UI }}
            className="absolute inset-0"
          >
            <Image
              src={activeImage.url}
              alt={activeImage.alt}
              fill
              preload={active === 0}
              sizes="(max-width: 767px) calc(100vw - 3rem), 50vw"
              className="rounded-2xl object-contain p-6 outline outline-1 -outline-offset-1 outline-black/10"
            />
          </motion.div>
        </AnimatePresence>
        {/* Indicio de zoom siempre visible: en táctil no existe el hover. */}
        <span
          aria-hidden="true"
          className="absolute right-3 bottom-3 flex size-10 items-center justify-center rounded-full bg-cream/90 text-ink shadow-card transition-colors duration-150 ease-out group-hover:bg-white motion-reduce:transition-none"
        >
          <ZoomIcon />
        </span>
      </button>

      {producto.imagenes.length > 1 && (
        <div
          className="grid grid-cols-4 gap-2 sm:grid-cols-5"
          role="group"
          aria-label="Galería del producto"
        >
          {producto.imagenes.map((image, index) => {
            const selected = active === index;
            return (
              <button
                key={image.url}
                type="button"
                aria-pressed={selected}
                aria-label={`Ver ${image.alt}`}
                onClick={() => setActive(index)}
                className={`relative aspect-square overflow-hidden rounded-lg bg-white transition-[opacity,box-shadow] duration-150 ease-out motion-reduce:transition-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss ${
                  selected
                    ? "opacity-100 shadow-[0_0_0_2px_var(--color-moss)]"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="(max-width: 767px) 25vw, 10vw"
                  className="rounded-lg object-contain p-1 outline outline-1 -outline-offset-1 outline-black/10"
                />
              </button>
            );
          })}
        </div>
      )}

      <ImageLightbox
        imagenes={producto.imagenes}
        index={expanded}
        onIndexChange={(index) => {
          setExpanded(index);
          setActive(index);
        }}
        onClose={() => setExpanded(null)}
      />
    </div>
  );
}
