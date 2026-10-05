"use client";

import { useTransition } from "react";
import { setFulfillmentStatus } from "./actions";
import type { FulfillmentStatus } from "@/lib/data/orders";
import {
  FULFILLMENT_LABELS,
  FULFILLMENT_PILL_CLASS,
  FULFILLMENT_PILL_CLASS_UNSET,
} from "@/lib/domain/fulfillmentStatus";

const OPTIONS = (Object.keys(FULFILLMENT_LABELS) as FulfillmentStatus[]).map((value) => ({
  value,
  label: FULFILLMENT_LABELS[value],
}));

export function FulfillmentStatusSelect({
  orderId,
  value,
}: {
  orderId: string;
  value: FulfillmentStatus | null;
}) {
  const [pending, startTransition] = useTransition();
  const pillClass = value ? FULFILLMENT_PILL_CLASS[value] : FULFILLMENT_PILL_CLASS_UNSET;

  return (
    <div className="relative inline-block">
      <select
        defaultValue={value ?? ""}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as FulfillmentStatus;
          startTransition(() => {
            void setFulfillmentStatus(orderId, next);
          });
        }}
        className={`appearance-none rounded-full py-1 pl-2.5 pr-6 text-[11.5px] font-semibold outline-none transition-opacity duration-200 disabled:opacity-60 ${pillClass}`}
      >
        <option value="" disabled>
          Sin definir
        </option>
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-admin-surface-raised text-admin-ink">
            {option.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 opacity-60"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
