"use client";

import { useState, useTransition } from "react";
import { setOrderArtisan, setOrderSupplier } from "./actions";

const SAVE = { supplier: setOrderSupplier, artisan: setOrderArtisan } as const;

/** Campo de texto libre del equipo (proveedor o artesano). Guarda al perder el foco. */
export function OrderNameInput({
  id,
  field,
  orderId,
  value: initial,
  placeholder,
}: {
  id: string;
  field: keyof typeof SAVE;
  orderId: string;
  value: string | null;
  placeholder: string;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <input
      id={id}
      value={value}
      placeholder={placeholder}
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => startTransition(() => void SAVE[field](orderId, value))}
      className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-ink outline-none transition-colors duration-200 placeholder:text-admin-ink-muted focus:border-admin-accent disabled:opacity-60"
    />
  );
}
