"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import type { OptionRow, ProductDetail, VariantRow } from "@/lib/data/admin-products";
import type { StockItemRow } from "@/lib/data/stock-items";
import {
  computeRecipeAvailability,
  rpcErrorMessage,
  validateRecipeRows,
} from "@/lib/domain/stockRecipe";
import {
  createVariant,
  setProductPublished,
  setVariantActive,
  uploadVariantImage,
} from "../actions";
import { productTypeLabel } from "../productTypes";
import { PublishBadge } from "../PublishBadge";
import { ActionStatus } from "../../ui/ActionStatus";
import { BackLink } from "../../ui/BackLink";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  selectClass,
} from "../../ui/formClasses";
import { adjustStockItem, saveOptionRecipe, saveVariantRecipe } from "../insumos/actions";

const CARD_CLASS = "rounded-xl border border-admin-border bg-admin-surface-raised";
const PUBLISH_ERROR = "No se pudo cambiar la publicación. Inténtalo de nuevo.";
const VARIANT_ACTIVE_ERROR = "No se pudo cambiar el estado de la variante. Inténtalo de nuevo.";

export function ProductEditor({ product }: { product: ProductDetail }) {
  const [published, setPublished] = useState(product.is_published);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [confirmingUnpublish, setConfirmingUnpublish] = useState(false);
  const [pending, startTransition] = useTransition();

  function applyPublished(next: boolean) {
    setPublishError(null);
    startTransition(async () => {
      try {
        await setProductPublished(product.id, next);
        // Solo se refleja el cambio cuando el servidor lo confirmó.
        setPublished(next);
      } catch {
        setPublishError(PUBLISH_ERROR);
      }
    });
  }

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <BackLink href="/admin/productos">Productos</BackLink>
      <div className={`flex flex-wrap items-center justify-between gap-3 p-4 ${CARD_CLASS}`}>
        <div>
          <h1 className="text-lg font-semibold text-admin-ink">{product.name}</h1>
          <p className="text-xs text-admin-ink-muted">
            {productTypeLabel(product.brand, product.category)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PublishBadge published={published} />
          <button
            type="button"
            disabled={pending}
            onClick={() => (published ? setConfirmingUnpublish(true) : applyPublished(true))}
            className={secondaryButtonClass}
          >
            {published ? "Despublicar" : "Publicar"}
          </button>
        </div>
        <ActionStatus
          message={publishError ? { tone: "error", text: publishError } : null}
          className="w-full text-xs"
        />
        <ConfirmDialog
          open={confirmingUnpublish}
          title={`¿Despublicar ${product.name}?`}
          description="El producto dejará de verse en la tienda. Puedes volver a publicarlo cuando quieras."
          confirmLabel="Despublicar"
          tone="danger"
          onCancel={() => setConfirmingUnpublish(false)}
          onConfirm={() => {
            setConfirmingUnpublish(false);
            applyPublished(false);
          }}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-admin-ink">Variantes</h2>
        {product.variants.map((variant) => (
          <VariantCard key={variant.id} variant={variant} stockItems={product.stockItems} />
        ))}
        {product.variants.length === 0 ? (
          <p className="text-sm text-admin-ink-muted">Sin variantes todavía.</p>
        ) : null}
      </div>

      <AddVariantForm productId={product.id} productSku={product.sku} />

      {product.options.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-admin-ink">Adicionales</h2>
          <p className="text-xs text-admin-ink-muted">
            Insumos que consume cada adicional por unidad. Vacío significa que no descuenta inventario.
          </p>
          {product.options.map((option) => (
            <OptionCard key={option.id} option={option} stockItems={product.stockItems} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function VariantCard({ variant, stockItems }: { variant: VariantRow; stockItems: StockItemRow[] }) {
  const router = useRouter();
  const selfItem = stockItems.find((i) => i.id === variant.selfItemId) ?? null;
  const selfOnly =
    selfItem !== null &&
    variant.components.length === 1 &&
    variant.components[0].stockItemId === selfItem.id;
  const bottleneck = stockItems.find((i) => i.id === variant.bottleneckItemId) ?? null;
  const [selfStock, setSelfStock] = useState(selfItem?.stockQty ?? 0);
  const [active, setActive] = useState(variant.is_active);
  const [imageUrl, setImageUrl] = useState(variant.image_url);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const stockId = useId();
  const imageId = useId();
  const [pending, startTransition] = useTransition();
  const [imageBroken, setImageBroken] = useState(false);
  const variantLabel =
    Object.entries(variant.attributes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ") || "Variante única";

  return (
    <div className={`flex flex-wrap items-center gap-4 p-3 ${CARD_CLASS}`}>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-admin-surface-sunken">
        {imageUrl && !imageBroken ? (
          <Image
            src={imageUrl}
            alt={variantLabel}
            fill
            sizes="56px"
            className="object-cover"
            onError={() => setImageBroken(true)}
          />
        ) : null}
      </div>

      <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
        <p className="text-sm font-medium text-admin-ink-secondary">{variantLabel}</p>
        <p className="text-xs text-admin-ink-muted">
          Disponible: {variant.availableUnits}
          {variant.availableUnits === 0 && variant.components.length === 0 ? " · sin receta" : ""}
          {!selfOnly && bottleneck ? ` · limita: ${bottleneck.name}` : ""}
        </p>
      </div>

      {selfOnly && selfItem ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={stockId} className={labelClass}>
            Stock
          </label>
          <div className="flex gap-2">
            <input
              id={stockId}
              type="number"
              inputMode="numeric"
              min={0}
              value={selfStock}
              onChange={(e) => setSelfStock(Number(e.target.value))}
              className={`${inputClass} w-24 font-admin-mono`}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setNotice(null);
                  const res = await adjustStockItem({
                    itemId: selfItem.id,
                    mode: "set",
                    qty: selfStock,
                    reason: "Ajuste desde la ficha del producto",
                  });
                  setError(res.ok ? res.warning : res.error);
                  if (res.ok) {
                    setNotice("Stock actualizado");
                    router.refresh();
                  }
                })
              }
              className={primaryButtonClass}
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-admin-ink-muted">Stock calculado por receta</p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor={imageId} className={labelClass}>
          Imagen
        </label>
        <input
          id={imageId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData();
            fd.set("file", file);
            setError(null);
            setNotice(null);
            setUploading(true);
            startTransition(async () => {
              const res = await uploadVariantImage(variant.id, variant.sku, fd);
              setUploading(false);
              if (res.ok) {
                setImageUrl(res.url);
                setImageBroken(false);
                setNotice("Imagen actualizada");
              } else {
                setError(res.error);
              }
            });
          }}
          className="min-h-11 text-sm text-admin-ink-secondary file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-lg file:border file:border-admin-border file:bg-admin-surface-raised file:px-3 file:text-sm file:font-medium file:text-admin-ink-secondary"
        />
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await setVariantActive(variant.id, !active);
              setActive((v) => !v);
              setError(null);
              setNotice(null);
            } catch {
              setError(VARIANT_ACTIVE_ERROR);
            }
          })
        }
        className={`min-h-11 rounded-lg px-3 py-2 text-sm font-medium transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:opacity-60 ${
          active ? "bg-admin-surface-sunken text-admin-ink-secondary" : "bg-admin-warning-bg text-admin-warning-fg"
        }`}
      >
        {active ? "Publicada" : "No publicada"}
      </button>

      <ActionStatus
        message={
          error
            ? { tone: "error", text: error }
            : uploading
              ? { tone: "ok", text: "Subiendo imagen…" }
              : notice
                ? { tone: "ok", text: notice }
                : null
        }
        className="w-full text-sm"
      />

      {!selfOnly ? (
        <details className="w-full" open={variant.components.length === 0}>
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-admin-ink-secondary">
            Receta de insumos
          </summary>
          <RecipeEditor
            initialRows={variant.components}
            stockItems={stockItems}
            allowEmpty={false}
            onSave={(rows) => saveVariantRecipe(variant.id, rows)}
          />
        </details>
      ) : null}
    </div>
  );
}

function OptionCard({ option, stockItems }: { option: OptionRow; stockItems: StockItemRow[] }) {
  return (
    <details className={`p-3 ${CARD_CLASS}`} open={option.components.length > 0}>
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-admin-ink">{option.name}</summary>
      <RecipeEditor
        initialRows={option.components}
        stockItems={stockItems}
        allowEmpty
        showUnits={false}
        onSave={(rows) => saveOptionRecipe(option.id, rows)}
      />
    </details>
  );
}

interface EditableRow {
  stockItemId: string;
  qty: number;
}

/** Editor de receta con vista previa de unidades y cuello de botella calculada en el cliente. */
function RecipeEditor({
  initialRows,
  stockItems,
  allowEmpty,
  showUnits = true,
  onSave,
}: {
  initialRows: { stockItemId: string; qtyRequired: number }[];
  stockItems: StockItemRow[];
  allowEmpty: boolean;
  showUnits?: boolean;
  onSave: (
    rows: { stockItemId: string; qtyRequired: number }[],
  ) => Promise<{ ok: true; availableUnits: number | null } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<EditableRow[]>(
    initialRows.map((r) => ({ stockItemId: r.stockItemId, qty: r.qtyRequired })),
  );
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = Object.fromEntries(stockItems.map((i) => [i.id, i]));
  const availability = Object.fromEntries(
    stockItems.map((i) => [i.id, { available: i.available, isActive: i.isActive }]),
  );
  const recipe = rows.map((r) => ({ stockItemId: r.stockItemId, qtyRequired: r.qty }));
  const validation = validateRecipeRows(recipe, { allowEmpty });
  const preview = computeRecipeAvailability(recipe, availability);
  const bottleneck = preview.bottleneckItemId ? byId[preview.bottleneckItemId] : null;

  const used = new Set(rows.map((r) => r.stockItemId));
  const pickable = stockItems.filter((i) => i.kind === "component" && i.isActive && !used.has(i.id));

  const update = (index: number, patch: Partial<EditableRow>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="mt-3 flex flex-col gap-3">
      {rows.map((row, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <select
            value={row.stockItemId}
            onChange={(e) => update(index, { stockItemId: e.target.value })}
            aria-label="Insumo"
            className={`${selectClass} min-w-[14rem] flex-1`}
          >
            {row.stockItemId === "" ? <option value="">Elige un insumo…</option> : null}
            {[...(byId[row.stockItemId] ? [byId[row.stockItemId]] : []), ...pickable].map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.available} disp.)
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            step={1}
            value={row.qty}
            onChange={(e) => update(index, { qty: Number(e.target.value) })}
            aria-label="Cantidad requerida"
            className={`${inputClass} w-24 font-admin-mono`}
          />
          <button
            type="button"
            onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
            className={secondaryButtonClass}
          >
            Quitar
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pickable.length === 0}
          onClick={() => setRows((prev) => [...prev, { stockItemId: "", qty: 1 }])}
          className={`${secondaryButtonClass} border-dashed border-admin-border-strong`}
        >
          Agregar insumo
        </button>
        {showUnits ? (
          <p className="text-xs text-admin-ink-muted">
            Vista previa: <span className="font-admin-mono font-medium text-admin-ink">{preview.availableUnits}</span>{" "}
            unidades
            {bottleneck ? ` · limita: ${bottleneck.name}${bottleneck.isActive ? "" : " (inactivo)"}` : ""}
          </p>
        ) : null}
        <button
          type="button"
          disabled={pending || !validation.ok}
          onClick={() =>
            startTransition(async () => {
              const res = await onSave(recipe);
              if (res.ok) {
                setMessage({
                  error: false,
                  text: res.availableUnits === null ? "Receta guardada." : `Receta guardada: ${res.availableUnits} unidades.`,
                });
                router.refresh();
              } else {
                setMessage({ error: true, text: res.error });
              }
            })
          }
          className={`${primaryButtonClass} ml-auto`}
        >
          Guardar receta
        </button>
      </div>

      {!validation.ok ? (
        <p className="text-xs text-admin-warning-fg">{rpcErrorMessage(validation.error)}</p>
      ) : null}
      <ActionStatus
        message={message ? { tone: message.error ? "error" : "ok", text: message.text } : null}
        className="text-xs"
      />
    </div>
  );
}

function AddVariantForm({ productId, productSku }: { productId: string; productSku: string }) {
  const [attributeKey, setAttributeKey] = useState("");
  const [attributeValue, setAttributeValue] = useState("");
  const [stockQty, setStockQty] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const keyId = useId();
  const valueId = useId();
  const qtyId = useId();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-4 rounded-xl border border-dashed border-admin-border-strong bg-admin-surface-raised p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setAdded(false);
        const fd = new FormData();
        fd.set("productId", productId);
        fd.set("productSku", productSku);
        fd.set("attributeKey", attributeKey);
        fd.set("attributeValue", attributeValue);
        fd.set("stockQty", String(stockQty));
        startTransition(async () => {
          const res = await createVariant(fd);
          if (res.ok) {
            setError(null);
            setAdded(true);
            setAttributeKey("");
            setAttributeValue("");
            setStockQty(0);
          } else {
            setError(res.error);
          }
        });
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={keyId} className={labelClass}>
          Atributo
        </label>
        <input
          id={keyId}
          value={attributeKey}
          onChange={(e) => setAttributeKey(e.target.value)}
          className={inputClass}
          placeholder="color"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={valueId} className={labelClass}>
          Valor
        </label>
        <input
          id={valueId}
          value={attributeValue}
          onChange={(e) => setAttributeValue(e.target.value)}
          className={inputClass}
          placeholder="blanco"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={qtyId} className={labelClass}>
          Stock inicial
        </label>
        <input
          id={qtyId}
          type="number"
          inputMode="numeric"
          min={0}
          value={stockQty}
          onChange={(e) => setStockQty(Number(e.target.value))}
          className={`${inputClass} w-24 font-admin-mono`}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className={primaryButtonClass}
      >
        Agregar variante
      </button>
      <ActionStatus
        message={error ? { tone: "error", text: error } : added ? { tone: "ok", text: "Variante agregada" } : null}
        className="w-full text-sm"
      />
    </form>
  );
}
