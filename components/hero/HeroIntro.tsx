import Link from "next/link";
import { FlyingCreatures } from "@/components/decor/FlyingCreatures";
import { HERO_INTRO } from "@/lib/content/home";
import { ScrollIndicator } from "./ScrollIndicator";

/**
 * Bloque de entrada del Home: eyebrow + titular + los dos caminos de salida
 * (catálogo y taller). Va ARRIBA de la banda de video, en flujo normal de
 * documento — nunca superpuesto al canvas.
 *
 * Es un server component a propósito: es el candidato a elemento LCP de la
 * página, así que no debe depender de que hidrate ningún árbol de cliente ni
 * de que carguen los frames del hero. Tampoco tiene animación de entrada, por
 * la misma razón (`nacer-motion` §5: nada que retrase o desplace el LCP).
 *
 * Hereda el fondo oscuro de `HeroSection` — el mismo color ambiente que los
 * bordes del video — para que el borde superior de la banda no se lea como el
 * borde de un reproductor.
 */
export function HeroIntro() {
  return (
    <div className="relative px-6 pt-24 pb-9 text-center md:px-16 md:pt-36 md:pb-14">
      <FlyingCreatures />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center">
        <p className="font-body text-xs uppercase tracking-[0.22em] text-amber md:text-sm">
          {HERO_INTRO.eyebrow}
        </p>

        <h1 className="font-display mt-4 text-3xl leading-[1.05] text-cream sm:text-4xl md:mt-5 md:text-5xl lg:text-6xl">
          {HERO_INTRO.title}
        </h1>

        <p className="font-body mt-5 max-w-2xl text-sm text-cream/70 md:mt-6 md:text-base">
          {HERO_INTRO.body}
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3 md:mt-9">
          <Link
            href={HERO_INTRO.primaryCta.href}
            className="inline-flex items-center gap-2 rounded-full bg-amber px-6 py-3 font-body text-sm font-medium text-ink transition-colors duration-200 hover:bg-amber-soft md:px-7"
          >
            {HERO_INTRO.primaryCta.label} →
          </Link>
          <Link
            href={HERO_INTRO.secondaryCta.href}
            className="inline-flex items-center gap-2 rounded-full border border-cream/25 px-6 py-3 font-body text-sm text-cream/85 transition-colors duration-200 hover:border-cream/50 hover:text-cream md:px-7"
          >
            {HERO_INTRO.secondaryCta.label}
          </Link>
        </div>

        {/* Debajo de sm el alto del viewport es escaso: el indicador cede el
            sitio para que titular y botones queden sobre la línea de flotación
            junto con el borde superior de la banda. */}
        <div className="hidden sm:block">
          <ScrollIndicator className="mt-10 md:mt-12" />
        </div>
      </div>
    </div>
  );
}
