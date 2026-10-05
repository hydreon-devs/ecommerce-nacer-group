"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import type { ProductDetail, VariantRow } from "@/lib/data/admin-products";
import {
  createVariant,
  setProductPublished,
  setVariantActive,
  updateVariantStock,
  uploadVariantImage,
} from "../actions";

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
          <VariantCard key={variant.id} variant={variant} />
        ))}
        {product.variants.length === 0 ? (
          <p className="text-sm text-admin-ink-muted">Sin variantes todavía.</p>
        ) : null}
      </div>

      <AddVariantForm productId={product.id} productSku={product.sku} />
    </div>
  );
}

function VariantCard({ variant }: { variant: VariantRow }) {
  const [stockQty, setStockQty] = useState(variant.stock_qty);
  const [active, setActive] = useState(variant.is_active);
  const [imageUrl, setImageUrl] = useState(variant.image_url);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [imageBroken, setImageBroken] = useState(false);

  const available = Math.max(stockQty - variant.reserved_qty, 0);

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
          Reservado: {variant.reserved_qty} · Disponible: {available}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-admin-ink-muted">Stock</label>
        <div className="flex gap-1">
          <input
            type="number"
            min={0}
            value={stockQty}
            onChange={(e) => setStockQty(Number(e.target.value))}
            className="w-20 rounded-lg border border-admin-border bg-admin-surface px-2 py-1 text-xs text-admin-ink outline-none focus:border-admin-accent"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => updateVariantStock(variant.id, stockQty))}
            className="rounded-lg bg-admin-accent px-2 py-1 text-xs text-admin-accent-ink transition-opacity duration-200 hover:opacity-90"
          >
            Guardar
          </button>
        </div>
      </div>

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
        <label className="text-xs text-admin-ink-muted">Stock</label>
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
