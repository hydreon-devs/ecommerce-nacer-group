"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp } from "./variants";

interface StaggerChildProps {
  as?: "div" | "h2" | "p";
  className?: string;
  children: ReactNode;
}

/**
 * Hijo individual de una sección `stagger-up`: hereda el estado
 * hidden/visible del `RevealSection` padre (propagación de variantes de
 * Framer Motion) y anima en cascada según el `staggerChildren` del
 * contenedor. Vive en su propio archivo de cliente porque acceder a
 * `motion.div` directamente en un Server Component (como `app/page.tsx`)
 * rompe el build de Next.js — el proxy de `motion` es client-only.
 */
export function StaggerChild({ as = "div", className, children }: StaggerChildProps) {
  const Component = motion[as];
  return (
    <Component className={className} variants={fadeUp}>
      {children}
    </Component>
  );
}
