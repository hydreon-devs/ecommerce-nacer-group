"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { DURATION_UI, EASE_UI } from "@/components/motion/variants";

/**
 * Enter animation for checkout sub-pages: `opacity` plus a short `transform`,
 * 250 ms (nacer-motion band 150-400 ms), keyed so every new page replays it.
 * Enter only: no exit means no gap where the height collapses (no CLS), and
 * the customer can click during it. Reduced motion, or the sober register
 * (condolencias), is a plain fade with no displacement.
 */
export function PageTransition({
  pageKey,
  sober = false,
  children,
}: {
  pageKey: string;
  sober?: boolean;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const offset = reduced || sober ? 0 : 8;
  return (
    <motion.div
      key={pageKey}
      initial={{ opacity: 0, y: offset }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_UI, ease: EASE_UI }}
    >
      {children}
    </motion.div>
  );
}
