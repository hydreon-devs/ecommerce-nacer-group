"use client";

import { useActionState, useState } from "react";
import { ActionStatus } from "../../ui/ActionStatus";
import { helpTextClass, inputClass, labelClass, primaryButtonClass } from "../../ui/formClasses";
import { createStockItem, updateStockItem, type FormState } from "./actions";

export function StockItemForm({
  item,
}: {
  item?: { id: string; sku: string; name: string; description: string | null; unit: string };
}) {
  const action = item ? updateStockItem.bind(null, item.id) : createStockItem;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });

  // Controlados: React reinicia los campos sin estado tras la acción aunque falle.
  const [sku, setSku] = useState(item?.sku ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "unidad");

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-transparent bg-admin-surface-raised p-4 shadow-admin-card"
    >
      {/* El SKU solo se pide al crear; al editar viaja oculto sin cambios. */}
      {item ? (
        <input type="hidden" name="sku" value={item.sku} />
      ) : (
        <label className="flex flex-col gap-1">
          <span className={labelClass}>SKU</span>
          <input
            name="sku"
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className={`${inputClass} font-admin-mono`}
          />
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Nombre</span>
        <input name="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Descripción</span>
        <textarea
          name="description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Unidad</span>
        <input name="unit" required value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass} />
      </label>
      {item ? <input type="hidden" name="previousSku" value={item.sku} /> : null}
      {!item ? (
        <p className={helpTextClass}>
          El stock inicial se carga después con un ajuste, para que quede en la bitácora de movimientos.
        </p>
      ) : null}
      <ActionStatus
        message={
          state.error
            ? { tone: "error", text: state.error }
            : state.saved
              ? { tone: "ok", text: "Cambios guardados" }
              : null
        }
      />
      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-fit`}>
        {pending ? "Guardando..." : item ? "Guardar cambios" : "Crear insumo"}
      </button>
    </form>
  );
}
