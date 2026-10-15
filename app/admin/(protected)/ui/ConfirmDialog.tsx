"use client";

import { Dialog } from "./Dialog";
import { dialogButtonClass } from "./formClasses";

const CONFIRM_TONE = {
  default: "bg-admin-accent text-admin-accent-ink hover:opacity-90",
  danger:
    "border border-admin-critical-fg/40 bg-admin-critical-bg text-admin-critical-fg hover:border-admin-critical-fg",
} as const;

/**
 * Confirmación modal sobre `Dialog`. Controlado: `open` lo decide quien lo
 * usa; `onCancel` se llama al cancelar, con Escape o al hacer clic fuera.
 * "Cancelar" va primero en el DOM, así que recibe el foco inicial (la opción
 * segura).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = "default",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  tone?: keyof typeof CONFIRM_TONE;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      busy={pending}
      hideClose
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={`${dialogButtonClass} text-admin-ink-secondary hover:text-admin-ink`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`${dialogButtonClass} ${CONFIRM_TONE[tone]}`}
          >
            {pending ? "Guardando…" : confirmLabel}
          </button>
        </>
      }
    />
  );
}
