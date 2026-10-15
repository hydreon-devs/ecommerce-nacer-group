"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { resolveLostOrder } from "../pedidos/actions";
import { LOST_NOTE_MAX, LOST_RESOLUTIONS, RESOLUTION_LABELS } from "@/lib/domain/lostFollowUp";
import { ActionStatus } from "../ui/ActionStatus";
import { Dialog } from "../ui/Dialog";
import { dialogButtonClass } from "../ui/formClasses";

const ERROR_MESSAGES: Record<string, string> = {
  RESOLUCION_INVALIDA: "Elige qué se hizo con el pedido.",
  NOTA_INVALIDA: `La nota admite hasta ${LOST_NOTE_MAX} caracteres.`,
  PEDIDO_CAMBIO:
    "El pedido cambió mientras tanto y ya no está por resolver. Actualiza la página para ver su estado actual.",
  PEDIDO_NO_EXISTE: "El pedido ya no existe.",
};
const GENERIC_ERROR = "No se pudo guardar la resolución. Inténtalo de nuevo.";

/**
 * "Resolver": abre un diálogo modal para registrar qué se hizo con un pedido
 * perdido (obligatorio) y una nota opcional. Es solo un registro: no reembolsa
 * ni crea pedidos. Usa `Dialog`, como `LostButton`; si el envío falla, el foco
 * vuelve al primer campo inválido.
 */
export function ResolveButton({ orderId, humanNumber }: { orderId: string; humanNumber: string }) {
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [note, setNote] = useState("");
  const [failure, setFailure] = useState<{ code: string; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const formId = `resolve-form-${orderId}`;
  const errorId = `resolve-error-${orderId}`;
  const noteId = `resolve-note-${orderId}`;
  const error = failure?.text ?? null;

  // Tras un fallo los campos vuelven a estar habilitados: el foco va al primero inválido.
  useEffect(() => {
    if (!failure || pending) return;
    if (failure.code === "RESOLUCION_INVALIDA") {
      fieldsetRef.current?.querySelector("input")?.focus();
    } else {
      noteRef.current?.focus();
    }
  }, [failure, pending]);

  function fail(code: string) {
    setFailure({ code, text: ERROR_MESSAGES[code] ?? GENERIC_ERROR });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFailure(null);
    startTransition(async () => {
      try {
        const result = await resolveLostOrder(orderId, resolution, note);
        if (result.ok) {
          // La página se revalida y el pedido pasa a "Resueltos".
          setOpen(false);
          setResolution("");
          setNote("");
        } else {
          fail(result.error);
        }
      } catch {
        fail("");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFailure(null);
          setOpen(true);
        }}
        className={`${dialogButtonClass} bg-admin-accent text-admin-accent-ink hover:opacity-90`}
      >
        Resolver
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Resolver ${humanNumber}`}
        description="Es solo un registro: no devuelve dinero, no crea un pedido y el estado sigue siendo perdido."
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
              {pending ? "Guardando…" : "Guardar resolución"}
            </button>
          </>
        }
      >
        <form id={formId} onSubmit={submit} className="flex flex-col gap-4">
          <fieldset ref={fieldsetRef} disabled={pending} className="flex flex-col gap-1">
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
              ref={noteRef}
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
