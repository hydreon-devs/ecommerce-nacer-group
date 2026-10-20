"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import type { Brand } from "@/lib/content/brands";
import { BrandCard } from "./BrandPanel";

/**
 * Selector de escritorio: nombres a la izquierda (tabs verticales), panel
 * grande a la derecha. Activa con hover, foco y clic; flechas/Home/End mueven
 * entre marcas (patrón tablist con tabindex itinerante).
 *
 * Todos los paneles están montados y apilados en la misma celda de la grilla:
 * el alto lo fija el más grande, así que cambiar de marca no mueve el layout
 * (cero CLS). El cruce anima solo `opacity` en 300 ms (rango 150-400 ms) y se
 * desactiva con `motion-reduce`. Los paneles inactivos quedan `invisible`, lo
 * que los saca del árbol de accesibilidad y del orden de tabulación.
 */
export function BrandSwitcher({ brands }: { brands: readonly Brand[] }) {
  const [activeId, setActiveId] = useState(brands[0].id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function moveTo(index: number) {
    const next = brands[(index + brands.length) % brands.length];
    setActiveId(next.id);
    tabRefs.current[next.id]?.focus();
  }

  function onKeyDown(event: KeyboardEvent, index: number) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        moveTo(index + 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        moveTo(index - 1);
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        event.preventDefault();
        moveTo(brands.length - 1);
        break;
    }
  }

  return (
    <div className="grid grid-cols-[30%_1fr] gap-10 lg:gap-14">
      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label="Marcas de Nacer Group"
        className="flex flex-col self-start border-t border-ink/10"
      >
        {brands.map((brand, index) => {
          const active = brand.id === activeId;
          return (
            <button
              key={brand.id}
              ref={(el) => {
                tabRefs.current[brand.id] = el;
              }}
              type="button"
              role="tab"
              id={`brand-tab-${brand.id}`}
              aria-selected={active}
              aria-controls={`brand-panel-${brand.id}`}
              tabIndex={active ? 0 : -1}
              onMouseEnter={() => setActiveId(brand.id)}
              onFocus={() => setActiveId(brand.id)}
              onClick={() => setActiveId(brand.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={`font-display border-b border-ink/10 py-5 text-left text-2xl leading-snug transition-colors duration-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-moss motion-reduce:transition-none lg:text-3xl ${
                active ? "text-ink" : "text-ink/45 hover:text-ink-muted"
              }`}
            >
              {brand.name}
            </button>
          );
        })}
      </div>

      <div className="grid">
        {brands.map((brand) => {
          const active = brand.id === activeId;
          return (
            <div
              key={brand.id}
              role="tabpanel"
              id={`brand-panel-${brand.id}`}
              aria-labelledby={`brand-tab-${brand.id}`}
              className={`col-start-1 row-start-1 transition-[opacity,visibility] duration-300 motion-reduce:transition-none ${
                active ? "visible opacity-100" : "invisible opacity-0"
              }`}
            >
              <BrandCard brand={brand} headingLevel="p" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
