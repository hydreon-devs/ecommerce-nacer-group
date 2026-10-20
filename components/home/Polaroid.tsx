"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ImagePlaceholder } from "@/components/catalogo/ImagePlaceholder";
import type { Occasion } from "@/lib/content/home";
import { polaroidMotion } from "@/lib/motion/polaroid";

/**
 * Polaroid de una ocasión: marco claro con borde inferior más grueso, imagen
 * 4:5 y el nombre debajo. No es enfocable ni lleva enlace: todavía no hay
 * catálogo filtrable por ocasión al que apuntar.
 *
 * La inclinación y el hover son solo `transform`, así que no introducen CLS.
 * El z-index sube en hover para que la tarjeta levantada pase por encima de sus
 * vecinas.
 */
export function Polaroid({ occasion }: { occasion: Occasion }) {
  const reduced = useReducedMotion() ?? false;
  const { rest, hover, transition } = polaroidMotion(occasion.tilt, reduced);

  return (
    <motion.div
      initial={false}
      animate={rest}
      whileHover={hover}
      transition={transition}
      className="relative w-56 rounded-sm border border-ink/10 bg-cream px-3 pb-10 pt-3 shadow-card hover:z-10 hover:shadow-card-hover"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-cream-soft">
        <ImagePlaceholder label={occasion.name} />
      </div>
      <p className="font-display absolute inset-x-3 bottom-3 text-center text-lg leading-tight text-ink">
        {occasion.name}
      </p>
    </motion.div>
  );
}
