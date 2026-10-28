"use client";

import { useActionState, useState } from "react";
import type { VariantBaseOption } from "@/lib/domain/stockItemCreate";
import { ActionStatus } from "../../ui/ActionStatus";
import { fieldsetClass, helpTextClass, inputClass, labelClass, primaryButtonClass } from "../../ui/formClasses";
import { PhotoPicker } from "../../ui/PhotoPicker";
import { createStockItem, updateStockItem, type FormState } from "./actions";
import { VariantBaseCombobox } from "./VariantBaseCombobox";

const ORIGINS = [
  ["workshop", "Hecho en taller"],
  ["purchased", "Comprado"],
] as const;

export function StockItemForm({
  item,
  baseOptions = [],
}: {
  item?: { id: string; name: string; description: string | null; unit: string };
  /** Active workshop components a new item can be a variant of (create only). */
  baseOptions?: VariantBaseOption[];
}) {
  const action = item ? updateStockItem.bind(null, item.id) : createStockItem;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });

  // Controlados: React reinicia los campos sin estado tras la acción aunque falle.
  const [origin, setOrigin] = useState<"workshop" | "purchased">("workshop");
  const [isVariant, setIsVariant] = useState(false);
  const [baseId, setBaseId] = useState("");
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "unidad");

  const dataFields = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
      <label className="flex flex-col gap-1 md:col-span-8">
        <span className={labelClass}>Nombre</span>
        <input name="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 md:col-span-4">
        <span className={labelClass}>Unidad</span>
        <input name="unit" required value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 md:col-span-12">
        <span className={labelClass}>Descripción</span>
        <textarea
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
      </label>
    </div>
  );

  const status = (
    <ActionStatus
      message={
        state.error
          ? { tone: "error", text: state.error }
          : state.saved
            ? { tone: "ok", text: "Cambios guardados" }
            : null
      }
    />
  );

  if (item) {
    return (
      <form action={formAction} className={fieldsetClass}>
        {dataFields}
        {status}
        <button type="submit" disabled={pending} className={`${primaryButtonClass} w-fit`}>
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-6 md:grid-cols-5">
      <fieldset className={`${fieldsetClass} min-w-0 md:col-span-3`}>
        <legend className="px-1 text-sm font-semibold text-admin-ink">Insumo</legend>
        {dataFields}
        <PhotoPicker />
      </fieldset>

      <fieldset className={`${fieldsetClass} min-w-0 md:col-span-2 md:self-start`}>
        <legend className="px-1 text-sm font-semibold text-admin-ink">Origen</legend>
        <div className="flex flex-col gap-2">
          <div role="radiogroup" aria-label="Origen" className="flex flex-wrap gap-x-4">
            {ORIGINS.map(([value, label]) => (
              <label key={value} className="flex min-h-11 items-center gap-2 text-sm text-admin-ink">
                <input
                  type="radio"
                  name="origin"
                  value={value}
                  checked={origin === value}
                  onChange={() => {
                    setOrigin(value);
                    if (value === "purchased") {
                      setIsVariant(false);
                      setBaseId("");
                    }
                  }}
                />
                {label}
              </label>
            ))}
          </div>
          <p className={helpTextClass}>La referencia (SKU) se asigna automáticamente al crear el insumo.</p>
        </div>
        {origin === "workshop" ? (
          <div className="flex flex-col gap-2">
            <label className="flex min-h-11 items-center gap-2 text-sm text-admin-ink">
              <input
                type="checkbox"
                checked={isVariant}
                onChange={(e) => {
                  setIsVariant(e.target.checked);
                  if (!e.target.checked) setBaseId("");
                }}
              />
              Variante de un insumo existente
            </label>
            {isVariant ? <VariantBaseCombobox options={baseOptions} value={baseId} onChange={setBaseId} /> : null}
          </div>
        ) : null}
      </fieldset>

      <div className="flex flex-col gap-4 md:col-span-5">
        <p className={helpTextClass}>
          El stock inicial se carga después con un ajuste, para que quede en la bitácora de movimientos.
        </p>
        {status}
        <button type="submit" disabled={pending} className={`${primaryButtonClass} w-fit`}>
          {pending ? "Creando..." : "Crear insumo"}
        </button>
      </div>
    </form>
  );
}
