"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { advanceFulfillment } from "./pedidos/actions";
import { ActionStatus } from "./ui/ActionStatus";
import { ADVANCE_GENERIC_ERROR, advanceErrorMessage, type ActionMessage } from "./ui/actionMessages";
import { ConfirmDialog } from "./ui/ConfirmDialog";

/**
 * Botón del siguiente paso de un pedido (Producción y Despachos). El texto lo
 * decide `nextStep` en el servidor de la página; la acción vuelve a decidir
 * el destino al escribir, así que este componente no envía la fase. Si falla,
 * el motivo queda junto al botón; con `confirm` pide confirmación antes (pasos
 * que no se pueden deshacer).
 */
export function AdvanceOrderButton({
  orderId,
  label,
  confirm,
}: {
  orderId: string;
  label: string;
  confirm?: { title: string; description?: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ActionMessage | null>(null);
  const [confirming, setConfirming] = useState(false);

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await advanceFulfillment(orderId);
        if (!result.ok) setError(advanceErrorMessage(result.error));
      } catch {
        setError(ADVANCE_GENERIC_ERROR);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => (confirm ? setConfirming(true) : run())}
        className="min-h-11 rounded-lg bg-admin-accent px-3 py-2 text-sm font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:opacity-60"
      >
        {pending ? "Guardando…" : label}
      </button>
      <ActionStatus
        message={error ? { tone: "error", text: error.text } : null}
        className="max-w-xs text-xs"
      >
        {error?.refresh ? (
          <>
            {" "}
            <button
              type="button"
              onClick={() => {
                setError(null);
                router.refresh();
              }}
              className="font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
            >
              Recargar
            </button>
          </>
        ) : null}
      </ActionStatus>
      {confirm ? (
        <ConfirmDialog
          open={confirming}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={label}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            run();
          }}
        />
      ) : null}
    </div>
  );
}
