"use client";

import { PRICE_STEP, type PriceRange } from "@/lib/domain/priceRange";
import { formatCop } from "@/lib/format";

interface PriceRangeFilterProps {
  bounds: PriceRange;
  value: PriceRange;
  onChange: (range: PriceRange) => void;
}

// Los dos `input[type=range]` se superponen sobre la misma pista: el input no
// recibe eventos (`pointer-events-none`) y solo su pulgar sí, así cada pulgar
// se arrastra por separado. Nativos: teclado, lectores de pantalla y táctil sin
// librería.
const thumb =
  "pointer-events-none absolute inset-x-0 top-1/2 h-0 w-full -translate-y-1/2 appearance-none bg-transparent " +
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-cream [&::-webkit-slider-thumb]:bg-moss [&::-webkit-slider-thumb]:shadow-md " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-cream [&::-moz-range-thumb]:bg-moss [&::-moz-range-thumb]:shadow-md " +
  "focus-visible:outline-none [&:focus-visible::-webkit-slider-thumb]:outline-2 [&:focus-visible::-webkit-slider-thumb]:outline-offset-2 [&:focus-visible::-webkit-slider-thumb]:outline-moss [&:focus-visible::-moz-range-thumb]:outline-2 [&:focus-visible::-moz-range-thumb]:outline-offset-2 [&:focus-visible::-moz-range-thumb]:outline-moss";

/**
 * Barra de precio con dos pulgares (mínimo y máximo). Controlada: el padre
 * guarda el rango y filtra en cada `onChange`, así la grilla se actualiza
 * mientras se arrastra. Los extremos (`bounds`) son los de la colección activa.
 */
export function PriceRangeFilter({ bounds, value, onChange }: PriceRangeFilterProps) {
  const span = bounds.max - bounds.min;
  const percent = (n: number) => ((n - bounds.min) / span) * 100;
  const isFullRange = value.min === bounds.min && value.max === bounds.max;
  // Con los pulgares juntos, el de arriba es el que se puede agarrar: en la
  // mitad derecha se sube el mínimo (lo útil es moverlo a la izquierda) y en la
  // izquierda el máximo.
  const minOnTop = value.min > bounds.min + span / 2;

  return (
    <fieldset className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <legend className="font-body text-xs uppercase tracking-wide text-ink-muted">
          Precio
        </legend>
        {!isFullRange && (
          <button
            type="button"
            onClick={() => onChange(bounds)}
            className="font-body text-xs text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline motion-reduce:transition-none"
          >
            Restablecer
          </button>
        )}
      </div>

      <p className="font-body text-sm text-ink tabular-nums">
        {formatCop(value.min)} – {formatCop(value.max)}
      </p>

      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-ink/10" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-moss"
          style={{ left: `${percent(value.min)}%`, right: `${100 - percent(value.max)}%` }}
        />
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={PRICE_STEP}
          value={value.min}
          onChange={(e) => onChange({ min: Math.min(Number(e.target.value), value.max), max: value.max })}
          aria-label="Precio mínimo"
          aria-valuetext={formatCop(value.min)}
          className={`${thumb} ${minOnTop ? "z-20" : "z-10"}`}
        />
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={PRICE_STEP}
          value={value.max}
          onChange={(e) => onChange({ min: value.min, max: Math.max(Number(e.target.value), value.min) })}
          aria-label="Precio máximo"
          aria-valuetext={formatCop(value.max)}
          className={`${thumb} ${minOnTop ? "z-10" : "z-20"}`}
        />
      </div>

      <div className="flex justify-between font-body text-xs text-ink-muted tabular-nums">
        <span>{formatCop(bounds.min)}</span>
        <span>{formatCop(bounds.max)}</span>
      </div>
    </fieldset>
  );
}
