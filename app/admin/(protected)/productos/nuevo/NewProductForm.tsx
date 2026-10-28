"use client";

import { useActionState, useState } from "react";
import { ActionStatus } from "../../ui/ActionStatus";
import { fieldsetClass, helpTextClass, inputClass, labelClass, primaryButtonClass, selectClass } from "../../ui/formClasses";
import { PhotoPicker } from "../../ui/PhotoPicker";
import { createProduct, type FormState } from "../actions";
import { CRISALIDAS_COLLECTIONS, PRODUCT_TYPES } from "../productTypes";

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
  // Todos los campos son controlados: React reinicia los no controlados tras la
  // acción aunque devuelva un error (p. ej. SKU duplicado) y se perdería lo escrito.
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [attributeKey, setAttributeKey] = useState("");
  const [stockQty, setStockQty] = useState("0");

  const [skuTouched, setSkuTouched] = useState(false);
  const [variantSkuTouched, setVariantSkuTouched] = useState(false);
  const [sku, setSku] = useState("");
  const [variantSku, setVariantSku] = useState("");

  const suggestedSku = `${PRODUCT_TYPES.find((t) => t.value === brand)?.skuPrefix ?? ""}-${slugCode(tipo, 3)}-${slugCode(name, 12)}`;
  const suggestedVariantSku = attributeValue
    ? `${sku || suggestedSku}-${slugCode(attributeValue, 2)}`
    : `${sku || suggestedSku}-STD`;

  const displaySku = skuTouched ? sku : suggestedSku;
  const displayVariantSku = variantSkuTouched ? variantSku : suggestedVariantSku;

  return (
    <form action={formAction} className="grid grid-cols-1 gap-6 md:grid-cols-5">
      <fieldset className={`${fieldsetClass} min-w-0 md:col-span-3`}>
        <legend className="px-1 text-sm font-semibold text-admin-ink">Producto</legend>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="flex flex-col gap-1 md:col-span-6">
            <label htmlFor="brand" className={labelClass}>
              Tipo de producto
            </label>
            <select
              id="brand"
              name="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className={selectClass}
            >
              {PRODUCT_TYPES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {brand === "crisalidas" ? (
            <div className="flex flex-col gap-1 md:col-span-6">
              <label htmlFor="category" className={labelClass}>
                Colección (franja comercial)
              </label>
              <select
                id="category"
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={selectClass}
              >
                <option value="">Sin colección</option>
                {CRISALIDAS_COLLECTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex flex-col gap-1 md:col-span-4">
            <label htmlFor="tipo" className={labelClass}>
              Línea
            </label>
            <input
              id="tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              maxLength={3}
              required
              aria-describedby="tipo-help"
              className={`${inputClass} uppercase`}
            />
            <p id="tipo-help" className={helpTextClass}>
              ej. ARR, TER, COL — 3 letras
            </p>
          </div>

          <div className="flex flex-col gap-1 md:col-span-8">
            <label htmlFor="name" className={labelClass}>
              Nombre
            </label>
            <input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-6">
            <label htmlFor="sku" className={labelClass}>
              SKU de producto
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
              aria-describedby="sku-help"
              className={`${inputClass} font-admin-mono uppercase`}
            />
            <p id="sku-help" className={helpTextClass}>
              Sugerido, editable
            </p>
          </div>

          <div className="flex flex-col gap-1 md:col-span-6">
            <label htmlFor="basePrice" className={labelClass}>
              Precio base (COP)
            </label>
            <input
              id="basePrice"
              name="basePrice"
              type="number"
              inputMode="numeric"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              min={0}
              step={1}
              required
              className={`${inputClass} font-admin-mono`}
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-12">
            <label htmlFor="description" className={labelClass}>
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={`${fieldsetClass} min-w-0 md:col-span-2 md:self-start`}>
        <legend className="px-1 text-sm font-semibold text-admin-ink">Variante inicial</legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="attributeKey" className={labelClass}>
              Atributo
            </label>
            <input
              id="attributeKey"
              name="attributeKey"
              value={attributeKey}
              onChange={(e) => setAttributeKey(e.target.value)}
              aria-describedby="attributeKey-help"
              className={inputClass}
            />
            <p id="attributeKey-help" className={helpTextClass}>
              Opcional, ej. color
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="attributeValue" className={labelClass}>
              Valor
            </label>
            <input
              id="attributeValue"
              name="attributeValue"
              value={attributeValue}
              onChange={(e) => setAttributeValue(e.target.value)}
              aria-describedby="attributeValue-help"
              className={inputClass}
            />
            <p id="attributeValue-help" className={helpTextClass}>
              ej. blanco
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="variantSku" className={labelClass}>
              SKU de variante
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
              aria-describedby="variantSku-help"
              className={`${inputClass} font-admin-mono uppercase`}
            />
            <p id="variantSku-help" className={helpTextClass}>
              Sugerido, editable
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="stockQty" className={labelClass}>
              Stock inicial
            </label>
            <input
              id="stockQty"
              name="stockQty"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
              required
              className={`${inputClass} font-admin-mono`}
            />
          </div>

          <PhotoPicker className="sm:col-span-2" />
        </div>
      </fieldset>

      <div className="flex flex-col gap-4 md:col-span-5">
        <ActionStatus message={state.error ? { tone: "error", text: state.error } : null} />

        <button type="submit" disabled={pending} className={`${primaryButtonClass} w-fit`}>
          {pending ? "Creando..." : "Crear producto"}
        </button>
      </div>
    </form>
  );
}
