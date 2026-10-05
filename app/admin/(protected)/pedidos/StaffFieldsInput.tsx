"use client";

import { useState, useTransition } from "react";
import { setOrderStaffFields } from "./actions";

/**
 * Edición inline de asesor/proveedor (spec 003 §5, texto libre). Guarda al
 * perder el foco, no en cada tecla — evita una escritura por carácter.
 */
export function StaffFieldsInput({
  orderId,
  advisorName,
  supplierName,
}: {
  orderId: string;
  advisorName: string | null;
  supplierName: string | null;
}) {
  const [advisor, setAdvisor] = useState(advisorName ?? "");
  const [supplier, setSupplier] = useState(supplierName ?? "");
  const [, startTransition] = useTransition();

  function save(next: { advisor: string; supplier: string }) {
    startTransition(() => {
      void setOrderStaffFields(orderId, { advisorName: next.advisor, supplierName: next.supplier });
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        value={advisor}
        placeholder="Asesor"
        onChange={(e) => setAdvisor(e.target.value)}
        onBlur={() => save({ advisor, supplier })}
        className="w-32 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-admin-ink outline-none transition-colors duration-200 placeholder:text-admin-ink-muted hover:border-admin-border hover:bg-admin-surface-sunken focus:border-admin-accent focus:bg-admin-surface"
      />
      <input
        value={supplier}
        placeholder="Proveedor"
        onChange={(e) => setSupplier(e.target.value)}
        onBlur={() => save({ advisor, supplier })}
        className="w-32 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-admin-ink-secondary outline-none transition-colors duration-200 placeholder:text-admin-ink-muted hover:border-admin-border hover:bg-admin-surface-sunken focus:border-admin-accent focus:bg-admin-surface"
      />
    </div>
  );
}
