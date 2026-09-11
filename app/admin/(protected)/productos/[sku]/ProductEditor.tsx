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

export function ProductEditor({ product }: { product: ProductDetail }) {
  const [published, setPublished] = useState(product.is_published);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm font-medium text-slate-900">{product.name}</p>
          <p className="text-xs text-slate-500">
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
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            published ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-800"
          }`}
        >
          {published ? "Publicado — despublicar" : "Despublicado — publicar"}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Variantes</h2>
        {product.variants.map((variant) => (
          <VariantCard key={variant.id} variant={variant} />
        ))}
        {product.variants.length === 0 ? (
          <p className="text-sm text-slate-400">Sin variantes todavía.</p>
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
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-3">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100">
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
        <p className="font-mono text-xs text-slate-600">{variant.sku}</p>
        <p className="text-xs text-slate-500">
          {Object.entries(variant.attributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ") || "sin atributos"}
        </p>
        <p className="text-xs text-slate-500">
          Reservado: {variant.reserved_qty} · Disponible: {available}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">Stock</label>
        <div className="flex gap-1">
          <input
            type="number"
            min={0}
            value={stockQty}
            onChange={(e) => setStockQty(Number(e.target.value))}
            className="w-20 rounded-md border border-slate-300 px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => updateVariantStock(variant.id, stockQty))}
            className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white"
          >
            Guardar
          </button>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-xs text-slate-500">
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
          className="text-xs"
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
        className={`rounded-md px-2 py-1 text-xs font-medium ${
          active ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-800"
        }`}
      >
        {active ? "Activa" : "Despublicada"}
      </button>

      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
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
      className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-4"
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
        <label className="text-xs text-slate-500">Atributo</label>
        <input
          value={attributeKey}
          onChange={(e) => setAttributeKey(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          placeholder="color"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">Valor</label>
        <input
          value={attributeValue}
          onChange={(e) => setAttributeValue(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          placeholder="blanco"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">Stock</label>
        <input
          type="number"
          min={0}
          value={stockQty}
          onChange={(e) => setStockQty(Number(e.target.value))}
          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
      >
        Agregar variante
      </button>
      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
    </form>
  );
}
