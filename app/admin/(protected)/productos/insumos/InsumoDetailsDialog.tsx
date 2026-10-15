"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProductUsage } from "@/lib/domain/stockUsage";
import { Dialog } from "../../ui/Dialog";
import { secondaryButtonClass } from "../../ui/formClasses";
import { ProductThumbnail } from "../ProductThumbnail";

export interface InsumoDialogData {
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  kind: "self" | "component";
  stockQty: number;
  reserved: number;
  available: number;
  isActive: boolean;
  products: ProductUsage[];
  options: { name: string; productName: string | null; qtyRequired: number }[];
  movements: { id: string; delta: number; stockAfter: number; reason: string; createdAt: string }[];
}

const SECTION_TITLE = "text-xs font-semibold uppercase tracking-wide text-admin-ink-muted";

const dateFmt = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

/**
 * "Ver más detalles" de un insumo, sobre `Dialog` (igual que el de Producción).
 */
export function InsumoDetailsDialog({ data }: { data: InsumoDialogData }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={secondaryButtonClass}>
        Ver más detalles
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        title={data.name}
        badge={
          <span className="rounded-full bg-admin-surface-sunken px-2.5 py-0.5 text-xs font-semibold text-admin-ink-secondary">
            {data.isActive ? "Activo" : "Inactivo"}
          </span>
        }
        bodyClassName="gap-6"
        footer={
          <Link
            href={`/admin/productos/insumos/${encodeURIComponent(data.sku)}`}
            className="inline-flex min-h-11 items-center rounded-lg bg-admin-accent px-3 py-2 text-sm font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
          >
            Editar, ajustar stock o eliminar
          </Link>
        }
      >
        <section className="flex flex-col gap-2" aria-label="Datos">
          <h3 className={SECTION_TITLE}>Datos</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <Field label="Unidad" value={data.unit} />
            <Field label="Tipo" value={data.kind === "self" ? "Espejo de variante" : "Insumo"} />
            <Field label="Stock" value={String(data.stockQty)} mono />
            <Field label="Reservado" value={String(data.reserved)} mono />
            <Field label="Disponible" value={String(data.available)} mono />
          </dl>
          <dl>
            <Field label="Descripción" value={data.description?.trim() || "—"} />
          </dl>
        </section>

        <section className="flex flex-col gap-2" aria-label="Usado en">
          <h3 className={SECTION_TITLE}>Usado en</h3>
          {data.products.length + data.options.length === 0 ? (
            <p className="text-sm text-admin-ink-muted">Ninguna receta lo usa todavía.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-admin-border border-y border-admin-border text-sm">
              {data.products.map((p) => (
                <li
                  key={p.productSku}
                  className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2"
                >
                  <span className="relative block h-16 w-16 overflow-hidden rounded-lg bg-admin-surface-sunken">
                    <ProductThumbnail url={p.imageUrl} alt={p.productName} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium text-admin-ink">{p.productName}</span>
                    {p.showVariants ? (
                      <span className="text-xs text-admin-ink-secondary">
                        {p.variants
                          .map(
                            (v) =>
                              `${v.label || "Única"}${p.uniformQty === null ? ` × ${v.qtyRequired}` : ""}`,
                          )
                          .join(", ")}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-right font-admin-mono text-admin-ink-secondary">
                    {p.uniformQty !== null ? (
                      <>
                        <span className="sr-only">Cantidad por unidad: </span>× {p.uniformQty}
                      </>
                    ) : (
                      "según variante"
                    )}
                  </span>
                </li>
              ))}
              {data.options.map((o, i) => (
                <li key={`o-${i}`} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-admin-ink-secondary">
                    Adicional «{o.name}»{o.productName ? ` de ${o.productName}` : ""}
                  </span>
                  <span className="font-admin-mono text-admin-ink-secondary">× {o.qtyRequired}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2" aria-label="Movimientos recientes">
          <h3 className={SECTION_TITLE}>Últimos movimientos</h3>
          {data.movements.length === 0 ? (
            <p className="text-sm text-admin-ink-muted">Sin movimientos.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {data.movements.map((m) => (
                <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 text-admin-ink-secondary">
                  <span className="text-xs text-admin-ink-muted">{dateFmt.format(new Date(m.createdAt))}</span>
                  <span className="font-admin-mono">{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
                  <span className="font-admin-mono text-xs text-admin-ink-muted">→ {m.stockAfter}</span>
                  <span>{m.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Dialog>
    </>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-admin-ink-muted">{label}</dt>
      <dd
        className={`whitespace-pre-wrap break-words ${
          value === "—" ? "text-admin-ink-muted" : "text-admin-ink-secondary"
        } ${mono ? "font-admin-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
