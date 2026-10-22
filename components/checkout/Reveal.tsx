"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { DURATION_UI, EASE_UI } from "@/components/motion/variants";

/**
 * Enter/exit for checkout sub-steps. `opacity` + a short `transform` only, 250ms
 * (nacer-motion band 150-400ms). With reduced motion it is a plain fade.
 * `initial={false}` on the presence: nothing animates on first render, so the
 * server HTML and the first paint are identical (no CLS from the entrance).
 */
export function Reveal({
  show,
  children,
  id,
}: {
  show: boolean;
  children: ReactNode;
  id?: string;
}) {
  const reduced = useReducedMotion();
  const offset = reduced ? 0 : 8;
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key={id ?? "reveal"}
          initial={{ opacity: 0, y: offset }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: offset }}
          transition={{ duration: DURATION_UI, ease: EASE_UI }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
