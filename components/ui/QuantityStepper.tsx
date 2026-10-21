"use client";

import { MinusIcon, PlusIcon } from "@/components/ui/icons";

interface QuantityStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Accessible name of the quantity, e.g. "Cantidad de Tarjeta 3D". */
  label: string;
}

const buttonClass =
  "inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/20 text-ink transition-[color,background-color,border-color,scale] duration-150 ease-out hover:border-moss hover:bg-moss/8 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink/20 disabled:hover:bg-transparent motion-reduce:transition-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss";

/** Minus / value / plus with 44px targets. The value is announced politely. */
export function QuantityStepper({
  value,
  min,
  max,
  onChange,
  label,
}: QuantityStepperProps) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-1">
      <button
        type="button"
        aria-label={`Disminuir: ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={buttonClass}
      >
        <MinusIcon />
      </button>
      <output
        aria-live="polite"
        className="min-w-8 text-center font-body text-sm tabular-nums text-ink"
      >
        {value}
      </output>
      <button
        type="button"
        aria-label={`Aumentar: ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={buttonClass}
      >
        <PlusIcon />
      </button>
    </div>
  );
}
