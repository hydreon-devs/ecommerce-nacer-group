"use client";

import { useActionState, useState } from "react";
import { createProduct, type FormState } from "../actions";

const BRANDS = [
  { value: "crisalidas", label: "Crisálidas y Mariposas" },
  { value: "jagua", label: "Jagua" },
  { value: "florea", label: "Florea" },
];

const CRISALIDAS_CATEGORIES = [
  "Pequeños Milagros",
  "Instantes de Vida",
  "Grandes Transformaciones",
  "Experiencias de Colección",
  "Mariposas de Liberación",
];

const BRAND_PREFIX: Record<string, string> = {
  crisalidas: "CRI",
  jagua: "JAG",
  florea: "FLO",
};

function slugCode(value: string, maxLength: number): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, maxLength);
}

const initialState: FormState = { error: null };

/**
 * Sugerencia de SKU en vivo (plan §7) — puramente client-side, no reproduce
 * la abreviatura humana exacta de los SKU ya cargados. Editable en todo
 * momento; la unicidad real se valida en el servidor al enviar.
 */
export function NewProductForm() {
  const [state, formAction, pending] = useActionState(createProduct, initialState);

  const [brand, setBrand] = useState("crisalidas");
  const [tipo, setTipo] = useState("");
  const [name, setName] = useState("");
  const [attributeValue, setAttributeValue] = useState("");

  const [skuTouched, setSkuTouched] = useState(false);
  const [variantSkuTouched, setVariantSkuTouched] = useState(false);
  const [sku, setSku] = useState("");
  const [variantSku, setVariantSku] = useState("");

  const suggestedSku = `${BRAND_PREFIX[brand]}-${slugCode(tipo, 3)}-${slugCode(name, 12)}`;
  const suggestedVariantSku = attributeValue
    ? `${sku || suggestedSku}-${slugCode(attributeValue, 2)}`
    : `${sku || suggestedSku}-STD`;

  const displaySku = skuTouched ? sku : suggestedSku;
  const displayVariantSku = variantSkuTouched ? variantSku : suggestedVariantSku;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">Producto</legend>

        <div className="flex flex-col gap-1">
          <label htmlFor="brand" className="text-sm font-medium text-slate-700">
            Marca
          </label>
          <select
            id="brand"
            name="brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {BRANDS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="tipo" className="text-sm font-medium text-slate-700">
            Tipo (línea de producto, ej. ARR, TER, COL — 3 letras)
          </label>
          <input
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            maxLength={3}
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-slate-700">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="sku" className="text-sm font-medium text-slate-700">
            SKU de producto (sugerido, editable)
          </label>
          <input
            id="sku"
            name="sku"
            value={displaySku}
            onChange={(e) => {
              setSkuTouched(true);
              setSku(e.target.value.toUpperCase());
            }}
            required
            className="rounded-md border border-slate-300 px-3 py-2 font-mono text-sm uppercase"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-slate-700">
            Descripción
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {brand === "crisalidas" ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="category" className="text-sm font-medium text-slate-700">
              Categoría (franja comercial)
            </label>
            <select
              id="category"
              name="category"
              defaultValue=""
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Sin categoría</option>
              {CRISALIDAS_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <label htmlFor="basePrice" className="text-sm font-medium text-slate-700">
            Precio base (COP)
          </label>
          <input
            id="basePrice"
            name="basePrice"
            type="number"
            min={0}
            step={1}
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">Variante inicial</legend>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="attributeKey" className="text-sm font-medium text-slate-700">
              Atributo (opcional, ej. color)
            </label>
            <input
              id="attributeKey"
              name="attributeKey"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="attributeValue" className="text-sm font-medium text-slate-700">
              Valor (ej. blanco)
            </label>
            <input
              id="attributeValue"
              name="attributeValue"
              value={attributeValue}
              onChange={(e) => setAttributeValue(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="variantSku" className="text-sm font-medium text-slate-700">
            SKU de variante (sugerido, editable)
          </label>
          <input
            id="variantSku"
            name="variantSku"
            value={displayVariantSku}
            onChange={(e) => {
              setVariantSkuTouched(true);
              setVariantSku(e.target.value.toUpperCase());
            }}
            required
            className="rounded-md border border-slate-300 px-3 py-2 font-mono text-sm uppercase"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="stockQty" className="text-sm font-medium text-slate-700">
            Stock inicial
          </label>
          <input
            id="stockQty"
            name="stockQty"
            type="number"
            min={0}
            step={1}
            defaultValue={0}
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </fieldset>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Creando..." : "Crear producto"}
      </button>
    </form>
  );
}
