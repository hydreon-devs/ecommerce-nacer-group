"use client";

import { useTransition } from "react";
import { advanceFulfillment } from "./pedidos/actions";

/**
 * Botón del siguiente paso de un pedido (Producción y Despachos). El texto lo
 * decide `nextStep` en el servidor de la página; la acción vuelve a decidir
 * el destino al escribir, así que este componente no envía la fase.
 */
export function AdvanceOrderButton({ orderId, label }: { orderId: string; label: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => void advanceFulfillment(orderId))}
      className="min-h-11 rounded-lg bg-admin-accent px-3 py-2 text-sm font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:opacity-60"
    >
      {pending ? "Guardando…" : label}
    </button>
  );
}
