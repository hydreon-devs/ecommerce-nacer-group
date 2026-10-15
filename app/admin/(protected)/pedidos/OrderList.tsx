"use client";

import { useState } from "react";
import { OrderRow, ROW_GRID } from "./OrderRow";
import type { OrderView } from "./orderView";

/**
 * Lista de pedidos con filas expandibles. El estado de expansión es local al
 * cliente (varias filas pueden estar abiertas a la vez); la página, servidor,
 * solo consulta y pasa los datos ya preparados.
 */
export function OrderList({ views }: { views: OrderView[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div
        aria-hidden="true"
        className={`${ROW_GRID} max-md:hidden border-b border-admin-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-admin-ink-muted`}
      >
        <span className="pl-6">Pedido</span>
        <span>Vendedor</span>
        <span>Factura</span>
        <span>Creado / Valor</span>
        <span>Estado</span>
      </div>
      <ul>
        {views.map((view) => (
          <OrderRow key={view.id} view={view} open={openIds.has(view.id)} onToggle={() => toggle(view.id)} />
        ))}
      </ul>
    </div>
  );
}
