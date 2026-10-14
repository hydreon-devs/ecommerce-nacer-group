"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adjustStockItem, deleteStockItem, setStockItemActive } from "../actions";

const INPUT_CLASS =
  "rounded-lg border border-admin-border bg-admin-surface px-2 py-1.5 text-sm text-admin-ink outline-none focus:border-admin-accent";

interface Props {
  item: {
    id: string;
    sku: string;
    stockQty: number;
    reserved: number;
    available: number;
    isActive: boolean;
    unit: string;
  };
}

export function StockItemControls({ item }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"delta" | "set">("delta");
  const [qty, setQty] = useState(0);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "warn" | "ok"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const toneClass = (tone: "error" | "warn" | "ok") =>
    tone === "error" ? "text-admin-critical-fg" : tone === "warn" ? "text-admin-warning-fg" : "text-admin-ink-secondary";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-admin-border bg-admin-surface-raised p-4">
      <dl className="grid grid-cols-3 gap-4 text-center">
        {[
          ["Stock", item.stockQty],
          ["Reservado", item.reserved],
          ["Disponible", item.available],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-admin-ink-muted">{label}</dt>
            <dd className="font-admin-mono text-2xl font-semibold text-admin-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await adjustStockItem({ itemId: item.id, mode, qty, reason });
            if (!res.ok) {
              setMessage({ tone: "error", text: res.error });
              return;
            }
            setMessage(
              res.warning
                ? { tone: "warn", text: `Ajuste aplicado. ${res.warning}` }
                : { tone: "ok", text: `Ajuste aplicado. Stock: ${res.stockQty}.` },
            );
            setReason("");
            router.refresh();
          });
        }}
      >
        <label className="flex flex-col gap-1 text-xs text-admin-ink-muted">
          Tipo de ajuste
          <select value={mode} onChange={(e) => setMode(e.target.value as "delta" | "set")} className={INPUT_CLASS}>
            <option value="delta">Sumar / restar</option>
            <option value="set">Fijar valor</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-admin-ink-muted">
          {mode === "delta" ? "Cantidad (+/-)" : "Nuevo stock"}
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className={`${INPUT_CLASS} w-28`}
          />
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-admin-ink-muted">
          Motivo (obligatorio)
          <input
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={INPUT_CLASS}
            placeholder="Compra, merma, conteo físico…"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-admin-accent px-3 py-1.5 text-sm font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
        >
          Ajustar stock
        </button>
      </form>

      <div className="flex flex-wrap gap-2 border-t border-admin-border pt-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setStockItemActive(item.id, item.sku, !item.isActive);
              router.refresh();
            })
          }
          className="rounded-lg bg-admin-surface-sunken px-3 py-1.5 text-xs font-medium text-admin-ink-secondary"
        >
          {item.isActive ? "Desactivar" : "Activar"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("¿Eliminar este insumo? Si está en uso, se archivará en su lugar.")) return;
            startTransition(async () => {
              const res = await deleteStockItem(item.id);
              if (!res.ok) {
                setMessage({ tone: "error", text: res.error });
              } else if (res.deleted) {
                router.push("/admin/productos/insumos");
              } else {
                const where = [...res.usedIn, ...res.options.map((o) => `adicional «${o}»`)];
                setMessage({
                  tone: "warn",
                  text: `${res.message} Archivado. En uso por: ${where.join(", ") || "—"}.`,
                });
                router.refresh();
              }
            });
          }}
          className="rounded-lg bg-admin-warning-bg px-3 py-1.5 text-xs font-medium text-admin-critical-fg"
        >
          Eliminar insumo
        </button>
      </div>

      {message ? <p className={`text-sm ${toneClass(message.tone)}`}>{message.text}</p> : null}
    </div>
  );
}
