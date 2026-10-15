"use client";

import { useRef, useState, useTransition } from "react";
import { ActionStatus, type StatusMessage } from "../ui/ActionStatus";
import { setOrderArtisan, setOrderSupplier } from "./actions";

const SAVE = { supplier: setOrderSupplier, artisan: setOrderArtisan } as const;
const SAVE_ERROR = "No se pudo guardar. Inténtalo de nuevo.";

/**
 * Campo de texto libre del equipo (proveedor o artesano). Guarda al perder el
 * foco solo si cambió, sin deshabilitarse (así no se pierde el foco a media
 * edición) y deja un "Guardado" o el error junto al campo.
 */
export function OrderNameInput({
  id,
  field,
  orderId,
  value: initial,
  placeholder,
}: {
  id: string;
  field: keyof typeof SAVE;
  orderId: string;
  value: string | null;
  placeholder: string;
}) {
  const [value, setValue] = useState(initial ?? "");
  const saved = useRef(initial ?? "");
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [pending, startTransition] = useTransition();
  const statusId = `${id}-status`;

  function save() {
    if (value.trim() === saved.current.trim()) return;
    const attempt = value;
    setStatus(null);
    startTransition(async () => {
      try {
        await SAVE[field](orderId, attempt);
        saved.current = attempt;
        setStatus({ tone: "ok", text: "Guardado" });
      } catch {
        setStatus({ tone: "error", text: SAVE_ERROR });
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        aria-busy={pending}
        aria-invalid={status?.tone === "error" ? true : undefined}
        aria-describedby={status ? statusId : undefined}
        onChange={(e) => {
          setValue(e.target.value);
          setStatus(null);
        }}
        onBlur={save}
        className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-ink outline-none transition-colors duration-200 placeholder:text-admin-ink-muted focus:border-admin-accent aria-busy:opacity-70"
      />
      <ActionStatus message={pending ? { tone: "ok", text: "Guardando…" } : status} id={statusId} className="text-xs" />
    </div>
  );
}
