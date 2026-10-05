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

const INPUT_CLASS =
  "rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-ink outline-none transition-colors duration-200 focus:border-admin-accent";
const LABEL_CLASS = "text-sm font-medium text-admin-ink-secondary";
const FIELDSET_CLASS =
  "flex flex-col gap-4 rounded-xl border border-admin-border bg-admin-surface-raised p-4 shadow-[0_1px_2px_rgba(11,17,32,0.04)]";

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
      <fieldset className={FIELDSET_CLASS}>
        <legend className="px-1 text-sm font-semibold text-admin-ink">Producto</legend>

        <div className="flex flex-col gap-1">
          <label htmlFor="brand" className={LABEL_CLASS}>
            Marca
          </label>
          <select
            id="brand"
            name="brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className={INPUT_CLASS}
          >
            {BRANDS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="tipo" className={LABEL_CLASS}>
            Tipo (línea de producto, ej. ARR, TER, COL — 3 letras)
          </label>
          <input
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            maxLength={3}
            required
            className={`${INPUT_CLASS} uppercase`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className={LABEL_CLASS}>
            Nombre
          </label>
          <input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="sku" className={LABEL_CLASS}>
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
            className={`${INPUT_CLASS} font-admin-mono uppercase`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className={LABEL_CLASS}>
            Descripción
          </label>
          <textarea id="description" name="description" rows={3} className={INPUT_CLASS} />
        </div>

        {brand === "crisalidas" ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="category" className={LABEL_CLASS}>
              Categoría (franja comercial)
            </label>
            <select id="category" name="category" defaultValue="" className={INPUT_CLASS}>
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
          <label htmlFor="basePrice" className={LABEL_CLASS}>
            Precio base (COP)
          </label>
          <input
            id="basePrice"
            name="basePrice"
            type="number"
            min={0}
            step={1}
            required
            className={`${INPUT_CLASS} font-admin-mono`}
          />
        </div>
      </fieldset>

      <fieldset className={FIELDSET_CLASS}>
        <legend className="px-1 text-sm font-semibold text-admin-ink">Variante inicial</legend>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="attributeKey" className={LABEL_CLASS}>
              Atributo (opcional, ej. color)
            </label>
            <input id="attributeKey" name="attributeKey" className={INPUT_CLASS} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="attributeValue" className={LABEL_CLASS}>
              Valor (ej. blanco)
            </label>
            <input
              id="attributeValue"
              name="attributeValue"
              value={attributeValue}
              onChange={(e) => setAttributeValue(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="variantSku" className={LABEL_CLASS}>
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
            className={`${INPUT_CLASS} font-admin-mono uppercase`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="stockQty" className={LABEL_CLASS}>
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
            className={`${INPUT_CLASS} font-admin-mono`}
          />
        </div>
      </fieldset>

      {state.error ? <p className="text-sm text-admin-critical-fg">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-admin-accent px-3 py-2 text-sm font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Creando..." : "Crear producto"}
      </button>
    </form>
  );
}
