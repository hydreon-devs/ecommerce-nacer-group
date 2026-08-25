"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import {
  getRevealVariant,
  soberVariant,
  withLateralBias,
  type RevealType,
} from "./variants";

interface RevealSectionProps {
  type: RevealType;
  align?: "left" | "right" | "center";
  /** Fuerza el registro sobrio (condolencias/acompañar/recordar) sin importar `type`. */
  sober?: boolean;
  /**
   * Lado que ocupa el bloque, para que entre resolviendo hacia él.
   *
   * Es independiente de `align`: `align` coloca y alinea texto, esto solo afecta
   * a la animación. En el recorrido del Home la imagen y el texto viven en lados
   * opuestos y cada uno pasa el suyo.
   *
   * Se ignora en el registro sobrio — ahí manda el fundido puro.
   */
  lateralBias?: "left" | "right";
  /**
   * Dispara la entrada cuando el bloque cruza el centro del viewport, en vez de
   * en cuanto asoma por abajo.
   *
   * El margen negativo encoge la caja de observación a una banda estrecha en
   * mitad de la pantalla, así que el elemento "entra" recién al llegar ahí. Con
   * el reveal por defecto (`amount: 0.35`) una imagen de 324px se animaba
   * pegada al borde inferior, donde casi no se ve.
   */
  atCenter?: boolean;
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
  lateralBias,
  atCenter = false,
  children,
  className = "",
  as = "section",
}: RevealSectionProps) {
  const prefersReducedMotion = useReducedMotion();

  // Único sitio que decide entre sobrio y no sobrio, y por eso también el único
  // que puede aplicar el sesgo lateral: así no hay forma de colárselo a una
  // sección de duelo desde fuera.
  const base = sober ? soberVariant : getRevealVariant(type);
  const variants =
    !sober && lateralBias ? withLateralBias(base, lateralBias) : base;

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
      viewport={
        atCenter
          ? { once: true, amount: "some", margin: "-45% 0px -45% 0px" }
          : { once: true, amount: 0.35 }
      }
      variants={prefersReducedMotion ? undefined : variants}
    >
      {children}
    </Component>
  );
}
