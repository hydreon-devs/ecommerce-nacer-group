"use client";

import { useRef, useState, useTransition } from "react";
import { markOrderLost } from "../pedidos/actions";
import { LOST_REASON_MAX } from "@/lib/domain/dispatch";

const ERROR_MESSAGES: Record<string, string> = {
  MOTIVO_INVALIDO: `Escribe el motivo (entre 1 y ${LOST_REASON_MAX} caracteres).`,
  PEDIDO_CAMBIO:
    "El pedido cambió mientras tanto y ya no está en despacho. Actualiza la página para ver su estado actual.",
  PEDIDO_NO_EXISTE: "El pedido ya no existe.",
};
const GENERIC_ERROR = "No se pudo marcar el pedido como perdido. Inténtalo de nuevo.";

const BASE_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:opacity-60";

/**
 * "Perdido": abre un diálogo modal que pide confirmar y escribir el motivo
 * (obligatorio). Usa el `<dialog>` nativo: el navegador atrapa el foco, cierra
 * con Escape y lo devuelve al botón. Mientras guarda no se puede cerrar ni
 * reenviar; si la acción falla, el mensaje queda en el diálogo.
 */
export function LostButton({ orderId, humanNumber }: { orderId: string; humanNumber: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleId = `lost-title-${orderId}`;
  const errorId = `lost-error-${orderId}`;
  const reasonId = `lost-reason-${orderId}`;

  function close() {
    ref.current?.close();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await markOrderLost(orderId, reason);
        if (result.ok) {
          // La página se revalida y el pedido sale de "En despacho".
          close();
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
          ref.current?.showModal();
        }}
        className={`${BASE_BUTTON} border border-admin-border bg-admin-surface-raised text-admin-ink-secondary hover:border-admin-border-strong hover:text-admin-ink`}
      >
        Perdido
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onCancel={(e) => {
          // Escape no debe cerrar a medio guardado.
          if (pending) e.preventDefault();
        }}
        className="animate-dialog-in m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-admin-border bg-admin-surface-raised p-0 text-admin-ink shadow-[0_24px_64px_-16px_rgba(11,17,32,0.4)] backdrop:bg-black/40"
      >
        <form onSubmit={submit} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-base font-semibold text-admin-ink">
              Marcar {humanNumber} como perdido
            </h2>
            <p className="text-sm text-admin-ink-secondary">
              El pedido sigue pagado y el inventario no se devuelve. Cuéntanos qué pasó para que
              quede registrado.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={reasonId} className="text-xs text-admin-ink-muted">
              Motivo
            </label>
            <textarea
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

          {error ? (
            <p
              id={errorId}
              role="alert"
              className="rounded-lg bg-admin-critical-bg px-3 py-2 text-sm text-admin-critical-fg"
            >
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className={`${BASE_BUTTON} text-admin-ink-secondary hover:text-admin-ink`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className={`${BASE_BUTTON} bg-admin-accent text-admin-accent-ink hover:opacity-90`}
            >
              {pending ? "Guardando…" : "Marcar perdido"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
