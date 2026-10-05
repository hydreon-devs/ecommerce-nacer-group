"use client";

import { useState, useTransition } from "react";
import { setOrderSupplier } from "./actions";

/** Único campo editable de esta vista. Guarda al perder el foco. */
export function SupplierInput({
  orderId,
  supplierName,
}: {
  orderId: string;
  supplierName: string | null;
}) {
  const [value, setValue] = useState(supplierName ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <input
      value={value}
      placeholder="¿Quién lo arma?"
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => startTransition(() => void setOrderSupplier(orderId, value))}
      className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-ink outline-none transition-colors duration-200 placeholder:text-admin-ink-muted focus:border-admin-accent disabled:opacity-60"
    />
  );
}
