"use client";

import { useTransition } from "react";
import { setFulfillmentStatus } from "./actions";
import type { FulfillmentStatus } from "@/lib/data/orders";

const OPTIONS: { value: FulfillmentStatus; label: string }[] = [
  { value: "en_construccion", label: "En construcción" },
  { value: "en_despacho", label: "En despacho" },
  { value: "entregado", label: "Entregado" },
  { value: "perdido", label: "Perdido" },
];

export function FulfillmentStatusSelect({
  orderId,
  value,
}: {
  orderId: string;
  value: FulfillmentStatus | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={value ?? ""}
      disabled={pending}
      onChange={(event) => {
        const next = event.target.value as FulfillmentStatus;
        startTransition(() => {
          void setFulfillmentStatus(orderId, next);
        });
      }}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-60"
    >
      <option value="" disabled>
        Sin definir
      </option>
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
