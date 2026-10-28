"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adjustNeedsConfirmation, nextQtyForMode, type AdjustMode } from "@/lib/domain/stockAdjust";
import { ActionStatus, type StatusMessage } from "../../../ui/ActionStatus";
import { ConfirmDialog } from "../../../ui/ConfirmDialog";
import { inputClass as INPUT_CLASS, labelClass, primaryButtonClass } from "../../../ui/formClasses";
import { adjustStockItem, deleteStockItem, setStockItemActive } from "../actions";


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
  const [mode, setMode] = useState<AdjustMode>("delta");
  const [qty, setQty] = useState(0);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [confirming, setConfirming] = useState<"adjust" | "deactivate" | "delete" | null>(null);
  const [pending, startTransition] = useTransition();

  function applyAdjust() {
    setMessage(null);
    startTransition(async () => {
      try {
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
      } catch {
        setMessage({ tone: "error", text: "No se pudo aplicar el ajuste. Inténtalo de nuevo." });
      }
    });
  }

  function applyActive(active: boolean) {
    setMessage(null);
    startTransition(async () => {
      try {
        await setStockItemActive(item.id, item.sku, active);
        router.refresh();
      } catch {
        setMessage({ tone: "error", text: "No se pudo cambiar el estado del insumo. Inténtalo de nuevo." });
      }
    });
  }

  function applyDelete() {
    setMessage(null);
    startTransition(async () => {
      try {
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
      } catch {
        setMessage({ tone: "error", text: "No se pudo eliminar el insumo. Inténtalo de nuevo." });
      }
    });
  }

  const dialog = {
    adjust: {
      title: qty === 0 ? "¿Dejar el stock en 0?" : `¿Bajar el stock de ${item.stockQty} a ${qty}?`,
      description: "Es una reducción grande. Confirma que el conteo es correcto.",
      confirmLabel: "Ajustar stock",
      tone: "danger" as const,
      run: applyAdjust,
    },
    deactivate: {
      title: "¿Desactivar este insumo?",
      description: "Dejará de poder agregarse como componente. Puedes activarlo de nuevo cuando quieras.",
      confirmLabel: "Desactivar",
      tone: "default" as const,
      run: () => applyActive(false),
    },
    delete: {
      title: "¿Eliminar este insumo?",
      description: "Si está en uso, se archivará en su lugar.",
      confirmLabel: "Eliminar insumo",
      tone: "danger" as const,
      run: applyDelete,
    },
  };
  const current = confirming ? dialog[confirming] : null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-transparent bg-admin-surface-raised p-4 shadow-admin-card">
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
          if (adjustNeedsConfirmation({ mode, current: item.stockQty, qty })) {
            setConfirming("adjust");
            return;
          }
          applyAdjust();
        }}
      >
        <label className={`flex flex-col gap-1 ${labelClass}`}>
          Tipo de ajuste
          <select
            value={mode}
            onChange={(e) => {
              const next = e.target.value as AdjustMode;
              setMode(next);
              setQty(nextQtyForMode(next, item.stockQty));
            }}
            className={INPUT_CLASS}
          >
            <option value="delta">Sumar / restar</option>
            <option value="set">Fijar valor</option>
          </select>
        </label>
        <label className={`flex flex-col gap-1 ${labelClass}`}>
          {mode === "delta" ? "Cantidad (+/-)" : "Nuevo stock"}
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className={`${INPUT_CLASS} w-28`}
          />
        </label>
        <label className={`flex min-w-[12rem] flex-1 flex-col gap-1 ${labelClass}`}>
          Motivo (obligatorio)
          <input
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={INPUT_CLASS}
            placeholder="Compra, merma, conteo físico…"
          />
        </label>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          Ajustar stock
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-4 border-t border-admin-border pt-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => (item.isActive ? setConfirming("deactivate") : applyActive(true))}
          className="min-h-11 rounded-lg bg-admin-surface-sunken px-3 py-1.5 text-xs font-medium text-admin-ink-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:opacity-60"
        >
          {item.isActive ? "Desactivar" : "Activar"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming("delete")}
          className="min-h-11 rounded-lg border border-admin-critical-fg/40 bg-admin-critical-bg px-3 py-1.5 text-xs font-medium text-admin-critical-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:opacity-60"
        >
          Eliminar insumo
        </button>
      </div>

      <ActionStatus message={message} />

      <ConfirmDialog
        open={confirming !== null}
        title={current?.title ?? ""}
        description={current?.description}
        confirmLabel={current?.confirmLabel ?? ""}
        tone={current?.tone}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          const run = current?.run;
          setConfirming(null);
          run?.();
        }}
      />
    </div>
  );
}
