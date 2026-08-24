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
 * Chip reutilizable: filtro de ocasión (interactivo, `as="button"`) o tag de
 * ocasión en la ficha de producto (estático, `as="span"`). Interacción
 * dentro del presupuesto de UI (150-400ms).
 */
export function Chip({ children, active = false, onClick, as = "button" }: ChipProps) {
  const base =
    "inline-flex items-center rounded-full border px-4 py-2 font-body text-sm transition-colors";
  const tone = active
    ? "border-moss bg-moss text-cream"
    : "border-ink/15 bg-transparent text-ink hover:border-moss/60";

  if (as === "span") {
    return <span className={`${base} ${tone} cursor-default`}>{children}</span>;
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={tapScale}
      transition={chipTransition}
      className={`${base} ${tone}`}
      aria-pressed={active}
    >
      {children}
    </motion.button>
  );
}
