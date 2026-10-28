"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { ActionStatus, type StatusMessage } from "../../ui/ActionStatus";
import { helpTextClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../../ui/formClasses";
import { validateImageFile } from "@/lib/domain/imageUpload";
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {/* El SKU solo se pide al crear; al editar viaja oculto sin cambios. */}
        {item ? (
          <input type="hidden" name="sku" value={item.sku} />
        ) : (
          <label className="flex flex-col gap-1 md:col-span-4">
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
        <label className={`flex flex-col gap-1 ${item ? "md:col-span-12" : "md:col-span-8"}`}>
          <span className={labelClass}>Nombre</span>
          <input name="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-4">
          <span className={labelClass}>Unidad</span>
          <input name="unit" required value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-8">
          <span className={labelClass}>Descripción</span>
          <textarea
            name="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </label>
        {!item ? <PhotoPicker /> : null}
      </div>
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

/** Foto opcional al crear: el archivo viaja en el mismo FormData (`photo`). */
function PhotoPicker() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // React reinicia el formulario tras la acción (también si falla) y vacía el input: la vista previa debe seguirlo.
  useEffect(() => {
    const form = inputRef.current?.form;
    const onReset = () => setPreviewUrl(null);
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, []);

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setPreviewUrl(null);
  }

  function onPick(file: File | undefined) {
    setMessage(null);
    if (!file) return clear();
    const check = validateImageFile(file);
    if (!check.ok) {
      clear();
      setMessage({ tone: "error", text: check.error });
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  }

  return (
    <div className="flex flex-wrap items-center gap-4 md:col-span-12">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-admin-surface-sunken">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:), no optimizable
          <img src={previewUrl} alt="Vista previa de la foto" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className={labelClass}>
          Foto (opcional)
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          name="photo"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => onPick(e.target.files?.[0])}
          className="min-h-11 text-sm text-admin-ink-secondary file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-lg file:border file:border-admin-border file:bg-admin-surface-raised file:px-3 file:text-sm file:font-medium file:text-admin-ink-secondary"
        />
        {previewUrl ? (
          <button type="button" onClick={clear} className={`${secondaryButtonClass} self-start`}>
            Quitar foto
          </button>
        ) : null}
        <ActionStatus message={message} />
      </div>
    </div>
  );
}
