"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { markOrderLost } from "../pedidos/actions";
import { LOST_REASON_MAX } from "@/lib/domain/dispatch";
import { ActionStatus } from "../ui/ActionStatus";
import { Dialog } from "../ui/Dialog";
import { dialogButtonClass, secondaryButtonClass } from "../ui/formClasses";

const ERROR_MESSAGES: Record<string, string> = {
  MOTIVO_INVALIDO: `Escribe el motivo (entre 1 y ${LOST_REASON_MAX} caracteres).`,
  PEDIDO_CAMBIO:
    "El pedido cambió mientras tanto y ya no está en despacho. Actualiza la página para ver su estado actual.",
  PEDIDO_NO_EXISTE: "El pedido ya no existe.",
};
const GENERIC_ERROR = "No se pudo marcar el pedido como perdido. Inténtalo de nuevo.";

/**
 * "Perdido": abre un diálogo modal que pide confirmar y escribir el motivo
 * (obligatorio). Usa `Dialog`: el foco queda atrapado, Escape cierra y vuelve
 * al botón. Mientras guarda no se puede cerrar ni reenviar; si la acción
 * falla, el mensaje queda en el diálogo y el foco vuelve al campo.
 */
export function LostButton({ orderId, humanNumber }: { orderId: string; humanNumber: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const formId = `lost-form-${orderId}`;
  const errorId = `lost-error-${orderId}`;
  const reasonId = `lost-reason-${orderId}`;

  // Tras un fallo, el campo vuelve a estar habilitado: ahí se devuelve el foco.
  useEffect(() => {
    if (error && !pending) reasonRef.current?.focus();
  }, [error, pending]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await markOrderLost(orderId, reason);
        if (result.ok) {
          // La página se revalida y el pedido sale de "En despacho".
          setOpen(false);
          setReason("");
        } else {
          setError(ERROR_MESSAGES[result.error] ?? GENERIC_ERROR);
        }
      } catch {
        setError(GENERIC_ERROR);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className={secondaryButtonClass}
      >
        Perdido
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Marcar ${humanNumber} como perdido`}
        description="El pedido sigue pagado y el inventario no se devuelve. Cuéntanos qué pasó para que quede registrado."
        busy={pending}
        hideClose
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className={`${dialogButtonClass} text-admin-ink-secondary hover:text-admin-ink`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form={formId}
              disabled={pending}
              className={`${dialogButtonClass} bg-admin-accent text-admin-accent-ink hover:opacity-90`}
            >
              {pending ? "Guardando…" : "Marcar perdido"}
            </button>
          </>
        }
      >
        <form id={formId} onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={reasonId} className="text-xs text-admin-ink-muted">
              Motivo
            </label>
            <textarea
              ref={reasonRef}
              id={reasonId}
              required
              rows={3}
              maxLength={LOST_REASON_MAX}
              value={reason}
              disabled={pending}
              onChange={(e) => setReason(e.target.value)}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={error ? true : undefined}
              className="w-full rounded-lg border border-admin-border bg-admin-surface-raised px-3 py-2 text-sm text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:opacity-60"
            />
            <span className="self-end font-admin-mono text-xs text-admin-ink-muted">
              {reason.length}/{LOST_REASON_MAX}
            </span>
          </div>

          <ActionStatus
            id={errorId}
            message={error ? { tone: "error", text: error } : null}
            className="rounded-lg bg-admin-critical-bg px-3 py-2 text-sm"
          />
        </form>
      </Dialog>
    </>
  );
}
