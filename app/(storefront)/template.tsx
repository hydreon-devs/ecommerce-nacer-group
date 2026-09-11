"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { pageTransition } from "@/components/motion/variants";

/**
 * Transición de página con fundido + desplazamiento corto. Vive en
 * `template.tsx`, no en `layout.tsx`: un layout no se remonta entre rutas
 * del mismo segmento, así que nunca dispararía la animación de entrada.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={pageTransition}
      className="flex flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
