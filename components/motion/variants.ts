import type { Transition, Variants } from "framer-motion";

/**
 * Sistema de variantes de Framer Motion del storefront.
 *
 * Reglas de `nacer-motion` aplicadas aquí:
 * - Animar solo `transform` y `opacity` (clip-reveal es la única excepción
 *   deliberada, ver nota abajo).
 * - Los reveals narrativos del Home usan 0.6–1.0s; las interacciones de UI
 *   (hover, chips, botones) usan 150–400ms.
 * - Todo movimiento entra "desde abajo" — nunca slide-left/right.
 * - `soberVariant` es obligatoria para cualquier sección o tarjeta marcada
 *   `condolencias` / `acompañar` / `recordar`: fundido simple, sin escala,
 *   sin rotación, sin spring. Se fuerza sin importar el tipo pedido.
 */

// ---- Timing --------------------------------------------------------------

export const EASE_NARRATIVE = [0.16, 1, 0.3, 1] as const; // salida suave, sin rebote
export const EASE_UI = [0.4, 0, 0.2, 1] as const;

export const DURATION_UI_FAST = 0.15;
export const DURATION_UI = 0.25;
export const DURATION_UI_SLOW = 0.4;
export const DURATION_NARRATIVE = 0.8;
export const DURATION_NARRATIVE_SLOW = 1.0;

/**
 * Los reveals del recorrido usan el extremo LENTO de la banda permitida (1.0s),
 * no el medio. Con las imágenes disparando al centro del viewport hay tiempo de
 * sobra para que la entrada se lea, y a 0.8s se sentía apurada.
 *
 * 1.0s es el techo documentado arriba. Si alguna vez hace falta más lento, es
 * un cambio de la regla, no de este número: se discute antes.
 */
const narrativeTransition: Transition = {
  duration: DURATION_NARRATIVE_SLOW,
  ease: EASE_NARRATIVE,
};

// ---- Tipos de reveal narrativo (Home) ------------------------------------

export type RevealType =
  | "fade-up"
  | "scale-up"
  | "rotate-in"
  | "clip-reveal"
  | "blur-up"
  | "stagger-up"
  | "sober";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: narrativeTransition },
};

export const scaleUp: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: narrativeTransition,
  },
};

export const rotateIn: Variants = {
  hidden: { opacity: 0, y: 24, rotate: -2.5 },
  visible: {
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: narrativeTransition,
  },
};

// clip-reveal es la única variante que toca una propiedad distinta de
// transform/opacity: clip-path no dispara layout (no es width/height/top/left)
// y se mantiene en el presupuesto de duración narrativa.
export const clipReveal: Variants = {
  hidden: { opacity: 0, clipPath: "inset(0% 0% 100% 0%)" },
  visible: {
    opacity: 1,
    clipPath: "inset(0% 0% 0% 0%)",
    transition: narrativeTransition,
  },
};

export const blurUp: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: narrativeTransition,
  },
};

// Contenedor para stagger-up: se combina con fadeUp en los hijos.
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.05,
    },
  },
};

/**
 * Registro sobrio obligatorio para `condolencias` / `acompañar` / `recordar`.
 * Fundido simple: sin desplazamiento, sin escala, sin rotación, sin spring.
 */
export const soberVariant: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION_NARRATIVE_SLOW, ease: "linear" },
  },
};

const REVEAL_VARIANTS: Record<RevealType, Variants> = {
  "fade-up": fadeUp,
  "scale-up": scaleUp,
  "rotate-in": rotateIn,
  "clip-reveal": clipReveal,
  "blur-up": blurUp,
  // El nodo raíz solo orquesta (staggerChildren); los hijos deben ser
  // `motion.div` con `variants={fadeUp}` para heredar el estado y animarse
  // en cascada — ver el uso en `app/page.tsx` (sección "cta-final").
  "stagger-up": staggerContainer,
  sober: soberVariant,
};

export function getRevealVariant(type: RevealType): Variants {
  return REVEAL_VARIANTS[type];
}

/**
 * Desplazamiento horizontal del sesgo lateral, en píxeles.
 *
 * Corto a propósito. La regla de arriba —"todo movimiento entra desde abajo,
 * nunca slide-left/right"— sigue en pie: 20px no se leen como un deslizamiento,
 * se leen como que el elemento resuelve hacia el lado donde vive. Subirlo a la
 * escala de un slide (60-80px) sí rompería la regla y habría que discutirlo
 * antes, no cambiarlo aquí.
 */
const LATERAL_BIAS_PX = 20;

/**
 * Añade a una variante de reveal un sesgo horizontal según el lado que ocupa el
 * elemento: lo de la izquierda entra desde un poco más a la izquierda, y al
 * revés.
 *
 * No se aplica al registro sobrio, y no porque se olvide: `soberVariant` es un
 * fundido puro sin desplazamiento (`nacer-motion` §2.6), así que sumarle un
 * `x` lo convertiría en otra cosa. Quien llame debe pasar la variante base ya
 * resuelta — ver `RevealSection`, que es el único sitio que decide entre sobrio
 * y no sobrio.
 */
export function withLateralBias(
  base: Variants,
  side: "left" | "right",
): Variants {
  const hidden = base.hidden;
  const visible = base.visible;
  if (typeof hidden !== "object" || typeof visible !== "object") return base;

  return {
    ...base,
    hidden: {
      ...hidden,
      x: side === "left" ? -LATERAL_BIAS_PX : LATERAL_BIAS_PX,
    },
    visible: { ...visible, x: 0 },
  };
}

// ---- Interacciones de UI (150-400ms) -------------------------------------

export const cardHover: Variants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: DURATION_UI, ease: EASE_UI },
  },
};

export const tapScale = { scale: 0.97 };

export const chipTransition: Transition = {
  duration: DURATION_UI_FAST,
  ease: EASE_UI,
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION_UI_SLOW, ease: EASE_UI },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: DURATION_UI, ease: EASE_UI },
  },
};
