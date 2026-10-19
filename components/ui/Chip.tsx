"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { chipTransition, tapScale } from "@/components/motion/variants";

interface ChipProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  as?: "button" | "span";
}

/**
 * Chip reutilizable: filtro de colección (interactivo, `as="button"`) o etiqueta
 * estática (`as="span"`). Interacción dentro del presupuesto de UI (150-400ms).
 * `min-h-11` da el objetivo táctil de 44px; solo transiciona color (no `all`).
 */
export function Chip({ children, active = false, onClick, as = "button" }: ChipProps) {
  const base =
    "inline-flex min-h-11 items-center rounded-full border px-4 py-2 font-body text-sm transition-[color,background-color,border-color] duration-150 ease-out motion-reduce:transition-none";
  const tone = active
    ? "border-moss bg-moss text-cream"
    : "border-ink/20 bg-transparent text-ink hover:border-moss hover:bg-moss/8";

  if (as === "span") {
    return <span className={`${base} ${tone} cursor-default`}>{children}</span>;
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={tapScale}
      transition={chipTransition}
      className={`${base} ${tone} [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss`}
      aria-pressed={active}
    >
      {children}
    </motion.button>
  );
}
