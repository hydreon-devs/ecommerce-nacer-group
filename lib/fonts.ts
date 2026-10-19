import { Fraunces, Manrope } from "next/font/google";

/**
 * Fuentes del storefront. Viven aquí y no en el layout porque
 * `app/global-not-found.tsx` no pasa por ningún layout y debe cargarlas por
 * su cuenta.
 */
export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

export const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});
