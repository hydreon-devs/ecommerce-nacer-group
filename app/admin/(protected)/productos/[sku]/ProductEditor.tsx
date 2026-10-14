"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { adjustStockItem, saveOptionRecipe, saveVariantRecipe } from "../insumos/actions";

const CARD_CLASS = "rounded-xl border border-admin-border bg-admin-surface-raised";

export function ProductEditor({ product }: { product: ProductDetail }) {
  const [published, setPublished] = useState(product.is_published);
  const [pending, startTransition] = useTransition();

  return (
    <div className="animate-view-in flex flex-col gap-6">
      <div className={`flex items-center justify-between p-4 ${CARD_CLASS}`}>
        <div>
          <p className="text-sm font-medium text-admin-ink">{product.name}</p>
          <p className="font-admin-mono text-xs text-admin-ink-muted">
            {product.sku} · {product.brand}
            {product.category ? ` · ${product.category}` : ""}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setProductPublished(product.id, !published);
              setPublished((v) => !v);
            })
          }
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity duration-200 ${
            published
              ? "bg-admin-surface-sunken text-admin-ink-secondary"
              : "bg-admin-warning-bg text-admin-warning-fg"
          }`}
        >
          {published ? "Publicado — despublicar" : "Despublicado — publicar"}
        </button>
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
  const [pending, startTransition] = useTransition();
  const [imageBroken, setImageBroken] = useState(false);

  return (
    <div className={`flex flex-wrap items-center gap-4 p-3 ${CARD_CLASS}`}>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-admin-surface-sunken">
        {imageUrl && !imageBroken ? (
          <Image
            src={imageUrl}
            alt={variant.sku}
            fill
            sizes="56px"
            className="object-cover"
            onError={() => setImageBroken(true)}
          />
        ) : null}
      </div>

      <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
        <p className="font-admin-mono text-xs text-admin-ink-secondary">{variant.sku}</p>
        <p className="text-xs text-admin-ink-muted">
          {Object.entries(variant.attributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ") || "sin atributos"}
        </p>
        <p className="text-xs text-admin-ink-muted">
          Disponible: {variant.availableUnits}
          {variant.availableUnits === 0 && variant.components.length === 0 ? " · sin receta" : ""}
          {!selfOnly && bottleneck ? ` · limita: ${bottleneck.name}` : ""}
        </p>
      </div>

      {selfOnly && selfItem ? (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-admin-ink-muted">Stock</label>
          <div className="flex gap-1">
            <input
              type="number"
              min={0}
              value={selfStock}
              onChange={(e) => setSelfStock(Number(e.target.value))}
              className="w-20 rounded-lg border border-admin-border bg-admin-surface px-2 py-1 text-xs text-admin-ink outline-none focus:border-admin-accent"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await adjustStockItem({
                    itemId: selfItem.id,
                    mode: "set",
                    qty: selfStock,
                    reason: "Ajuste desde la ficha del producto",
                  });
                  setError(res.ok ? res.warning : res.error);
                  if (res.ok) router.refresh();
                })
              }
              className="rounded-lg bg-admin-accent px-2 py-1 text-xs text-admin-accent-ink transition-opacity duration-200 hover:opacity-90"
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-admin-ink-muted">Stock calculado por receta</p>
      )}

      <label className="flex flex-col gap-1 text-xs text-admin-ink-muted">
        Imagen
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData();
            fd.set("file", file);
            startTransition(async () => {
              const res = await uploadVariantImage(variant.id, variant.sku, fd);
              if (res.ok) {
                setImageUrl(res.url);
                setImageBroken(false);
                setError(null);
              } else {
                setError(res.error);
              }
            });
          }}
          className="text-xs text-admin-ink-secondary"
        />
      </label>

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await setVariantActive(variant.id, !active);
            setActive((v) => !v);
          })
        }
        className={`rounded-lg px-2 py-1 text-xs font-medium transition-opacity duration-200 ${
          active ? "bg-admin-surface-sunken text-admin-ink-secondary" : "bg-admin-warning-bg text-admin-warning-fg"
        }`}
      >
        {active ? "Activa" : "Despublicada"}
      </button>

      {error ? <p className="w-full text-xs text-admin-critical-fg">{error}</p> : null}

      {!selfOnly ? (
        <details className="w-full" open={variant.components.length === 0}>
          <summary className="cursor-pointer text-xs font-medium text-admin-ink-secondary">
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
      <summary className="cursor-pointer text-sm font-medium text-admin-ink">{option.name}</summary>
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
    <div className="mt-3 flex flex-col gap-2">
      {rows.map((row, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <select
            value={row.stockItemId}
            onChange={(e) => update(index, { stockItemId: e.target.value })}
            className="min-w-[14rem] flex-1 rounded-lg border border-admin-border bg-admin-surface px-2 py-1 text-xs text-admin-ink outline-none focus:border-admin-accent"
          >
            {row.stockItemId === "" ? <option value="">Elige un insumo…</option> : null}
            {[...(byId[row.stockItemId] ? [byId[row.stockItemId]] : []), ...pickable].map((i) => (
              <option key={i.id} value={i.id}>
                {i.sku} — {i.name} ({i.available} disp.)
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
            className="w-20 rounded-lg border border-admin-border bg-admin-surface px-2 py-1 text-xs text-admin-ink outline-none focus:border-admin-accent"
          />
          <button
            type="button"
            onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
            className="rounded-lg bg-admin-surface-sunken px-2 py-1 text-xs text-admin-ink-secondary"
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
          className="rounded-lg border border-dashed border-admin-border-strong px-2 py-1 text-xs text-admin-ink-secondary disabled:opacity-50"
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
          className="ml-auto rounded-lg bg-admin-accent px-3 py-1 text-xs font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
        >
          Guardar receta
        </button>
      </div>

      {!validation.ok ? (
        <p className="text-xs text-admin-warning-fg">{rpcErrorMessage(validation.error)}</p>
      ) : null}
      {message ? (
        <p className={`text-xs ${message.error ? "text-admin-critical-fg" : "text-admin-ink-secondary"}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

function AddVariantForm({ productId, productSku }: { productId: string; productSku: string }) {
  const [attributeKey, setAttributeKey] = useState("");
  const [attributeValue, setAttributeValue] = useState("");
  const [stockQty, setStockQty] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-admin-border-strong bg-admin-surface-raised p-4"
      onSubmit={(e) => {
        e.preventDefault();
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
        <label className="text-xs text-admin-ink-muted">Atributo</label>
        <input
          value={attributeKey}
          onChange={(e) => setAttributeKey(e.target.value)}
          className="rounded-lg border border-admin-border bg-admin-surface px-2 py-1 text-sm text-admin-ink outline-none focus:border-admin-accent"
          placeholder="color"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-admin-ink-muted">Valor</label>
        <input
          value={attributeValue}
          onChange={(e) => setAttributeValue(e.target.value)}
          className="rounded-lg border border-admin-border bg-admin-surface px-2 py-1 text-sm text-admin-ink outline-none focus:border-admin-accent"
          placeholder="blanco"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-admin-ink-muted">Stock inicial</label>
        <input
          type="number"
          min={0}
          value={stockQty}
          onChange={(e) => setStockQty(Number(e.target.value))}
          className="w-24 rounded-lg border border-admin-border bg-admin-surface px-2 py-1 text-sm text-admin-ink outline-none focus:border-admin-accent"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-admin-accent px-3 py-1.5 text-sm font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
      >
        Agregar variante
      </button>
      {error ? <p className="w-full text-xs text-admin-critical-fg">{error}</p> : null}
    </form>
  );
}
