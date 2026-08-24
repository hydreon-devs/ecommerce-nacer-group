import { AnimatedCounter } from "./AnimatedCounter";
import { RevealSection } from "./RevealSection";
import type { HomeStat } from "@/lib/content/home";

interface StatsOverlayProps {
  stats: HomeStat[];
}

/**
 * Única sección del Home con overlay oscuro de ancho completo y texto
 * centrado — el resto de secciones vive en las zonas laterales del 40%.
 * Cifras de ejemplo: ver el aviso en `lib/content/home.ts`.
 */
export function StatsOverlay({ stats }: StatsOverlayProps) {
  return (
    <RevealSection
      type="clip-reveal"
      align="center"
      className="bg-ink text-cream"
    >
      <div className="px-6 py-24 md:py-32 bg-ink/90">
        <div className="mx-auto max-w-4xl grid grid-cols-1 gap-12 text-center sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.id} className="flex flex-col items-center gap-2">
              <AnimatedCounter
                value={stat.value}
                suffix={stat.suffix}
                className="font-display text-5xl md:text-6xl text-amber"
              />
              <p className="font-body text-sm md:text-base text-cream/80 uppercase tracking-wide">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
