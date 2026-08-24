"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { getRevealVariant, soberVariant, type RevealType } from "./variants";

interface RevealSectionProps {
  type: RevealType;
  align?: "left" | "right" | "center";
  /** Fuerza el registro sobrio (condolencias/acompañar/recordar) sin importar `type`. */
  sober?: boolean;
  children: ReactNode;
  className?: string;
  as?: "section" | "div";
}

/**
 * Envoltura de reveal narrativo para secciones del Home / bloques de
 * contenido. `whileInView` con `viewport={{ once: true }}` — las secciones
 * aparecen una sola vez, no en cada scroll de ida y vuelta.
 *
 * Si `sober` es true (ocasión condolencias/acompañar/recordar), se ignora
 * `type` y se aplica siempre `soberVariant`: es una regla de dominio, no una
 * preferencia de estilo.
 */
export function RevealSection({
  type,
  align = "left",
  sober = false,
  children,
  className = "",
  as = "section",
}: RevealSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const variants = sober ? soberVariant : getRevealVariant(type);

  // Mobile (<768px) siempre colapsa a centrado, sin importar `align` — la
  // alternancia izquierda/derecha es un layout de escritorio.
  const alignClass =
    align === "left"
      ? "mx-auto text-center md:mr-auto md:ml-0 md:text-left"
      : align === "right"
        ? "mx-auto text-center md:ml-auto md:mr-0 md:text-right"
        : "mx-auto text-center";

  const Component = motion[as];

  return (
    <Component
      className={`${alignClass} ${className}`}
      initial={prefersReducedMotion ? undefined : "hidden"}
      whileInView={prefersReducedMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.35 }}
      variants={prefersReducedMotion ? undefined : variants}
    >
      {children}
    </Component>
  );
}
