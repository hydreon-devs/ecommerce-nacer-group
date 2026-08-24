"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

/**
 * Contador animado con `animate()` de Framer Motion + estado de React en el
 * callback `onUpdate`. Evita el patrón `gsap.from(el, { textContent: 0 })`
 * (interpola la cadena directamente en el DOM sin redondear, produce
 * decimales visibles): aquí siempre se redondea antes de pintar.
 *
 * Cuenta una sola vez al entrar en viewport (`useInView` con `once: true`).
 * Con `prefers-reduced-motion`, salta directo al valor final.
 */
export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 1.6,
  className = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // El caso reduced-motion no anima nada: se resuelve como valor derivado
    // más abajo (`shown`), sin pasar por setState en el efecto.
    if (!isInView || prefersReducedMotion) return;

    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });

    return () => controls.stop();
  }, [isInView, prefersReducedMotion, value, duration]);

  const shown = prefersReducedMotion && isInView ? value : display;

  return (
    <span ref={ref} className={className}>
      {prefix}
      {shown.toLocaleString("es-CO")}
      {suffix}
    </span>
  );
}
