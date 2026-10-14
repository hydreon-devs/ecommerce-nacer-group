"use client";

import { useActionState } from "react";
import { createStockItem, updateStockItem, type FormState } from "./actions";

const INPUT_CLASS =
  "rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-ink outline-none transition-colors duration-200 focus:border-admin-accent";
const LABEL_CLASS = "text-sm font-medium text-admin-ink-secondary";

export function StockItemForm({
  item,
}: {
  item?: { id: string; sku: string; name: string; description: string | null; unit: string };
}) {
  const action = item ? updateStockItem.bind(null, item.id) : createStockItem;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-admin-border bg-admin-surface-raised p-4"
    >
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>SKU</span>
        <input name="sku" required defaultValue={item?.sku} className={`${INPUT_CLASS} font-admin-mono`} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Nombre</span>
        <input name="name" required defaultValue={item?.name} className={INPUT_CLASS} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Descripción</span>
        <textarea name="description" rows={2} defaultValue={item?.description ?? ""} className={INPUT_CLASS} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Unidad</span>
        <input name="unit" required defaultValue={item?.unit ?? "unidad"} className={INPUT_CLASS} />
      </label>
      {!item ? (
        <p className="text-xs text-admin-ink-muted">
          El stock inicial se carga después con un ajuste, para que quede en la bitácora de movimientos.
        </p>
      ) : null}
      {state.error ? <p className="text-sm text-admin-critical-fg">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-admin-accent px-4 py-2 text-sm font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
      >
        {item ? "Guardar cambios" : "Crear insumo"}
      </button>
    </form>
  );
}
