"use client";

import { useRef, useState, useTransition } from "react";
import { resolveLostOrder } from "../pedidos/actions";
import { LOST_NOTE_MAX, LOST_RESOLUTIONS, RESOLUTION_LABELS } from "@/lib/domain/lostFollowUp";

const ERROR_MESSAGES: Record<string, string> = {
  RESOLUCION_INVALIDA: "Elige qué se hizo con el pedido.",
  NOTA_INVALIDA: `La nota admite hasta ${LOST_NOTE_MAX} caracteres.`,
  PEDIDO_CAMBIO:
    "El pedido cambió mientras tanto y ya no está por resolver. Actualiza la página para ver su estado actual.",
  PEDIDO_NO_EXISTE: "El pedido ya no existe.",
};
const GENERIC_ERROR = "No se pudo guardar la resolución. Inténtalo de nuevo.";

const BASE_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:opacity-60";

/**
 * "Resolver": abre un diálogo modal para registrar qué se hizo con un pedido
 * perdido (obligatorio) y una nota opcional. Es solo un registro: no reembolsa
 * ni crea pedidos. Usa el `<dialog>` nativo, como `LostButton`.
 */
export function ResolveButton({ orderId, humanNumber }: { orderId: string; humanNumber: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [resolution, setResolution] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleId = `resolve-title-${orderId}`;
  const errorId = `resolve-error-${orderId}`;
  const noteId = `resolve-note-${orderId}`;

  function close() {
    ref.current?.close();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await resolveLostOrder(orderId, resolution, note);
        if (result.ok) {
          // La página se revalida y el pedido pasa a "Resueltos".
          close();
          setResolution("");
          setNote("");
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
        className={`${BASE_BUTTON} bg-admin-accent text-admin-accent-ink hover:opacity-90`}
      >
        Resolver
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
              Resolver {humanNumber}
            </h2>
            <p className="text-sm text-admin-ink-secondary">
              Es solo un registro: no devuelve dinero, no crea un pedido y el estado sigue siendo
              perdido.
            </p>
          </div>

          <fieldset disabled={pending} className="flex flex-col gap-1">
            <legend className="mb-1 text-xs text-admin-ink-muted">Qué se hizo</legend>
            {LOST_RESOLUTIONS.map((value) => (
              <label
                key={value}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-admin-border px-3 text-sm text-admin-ink has-[:checked]:border-admin-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-admin-accent"
              >
                <input
                  type="radio"
                  name={`resolution-${orderId}`}
                  value={value}
                  required
                  checked={resolution === value}
                  onChange={() => setResolution(value)}
                  className="accent-admin-accent"
                />
                {RESOLUTION_LABELS[value]}
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col gap-1">
            <label htmlFor={noteId} className="text-xs text-admin-ink-muted">
              Nota (opcional)
            </label>
            <textarea
              id={noteId}
              rows={3}
              maxLength={LOST_NOTE_MAX}
              value={note}
              disabled={pending}
              onChange={(e) => setNote(e.target.value)}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={error ? true : undefined}
              className="w-full rounded-lg border border-admin-border bg-admin-surface-raised px-3 py-2 text-sm text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:opacity-60"
            />
            <span className="self-end font-admin-mono text-xs text-admin-ink-muted">
              {note.length}/{LOST_NOTE_MAX}
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
              {pending ? "Guardando…" : "Guardar resolución"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
