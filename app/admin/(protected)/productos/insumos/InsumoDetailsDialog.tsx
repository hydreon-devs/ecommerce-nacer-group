"use client";

import Link from "next/link";
import { useRef } from "react";
import type { ProductUsage } from "@/lib/domain/stockUsage";
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

const SECTION_TITLE = "text-[10.5px] font-semibold uppercase tracking-wide text-admin-ink-muted";

const dateFmt = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

/**
 * "Ver más detalles" de un insumo. Misma mecánica que el diálogo de Producción:
 * `<dialog>` nativo modal (foco atrapado, Escape cierra, clic en el fondo cierra
 * salvo que el clic haya empezado dentro).
 */
export function InsumoDetailsDialog({ data }: { data: InsumoDialogData }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);
  const titleId = `insumo-title-${data.sku}`;

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex min-h-11 items-center rounded-lg border border-admin-border bg-admin-surface-raised px-3 py-2 text-sm font-medium text-admin-ink-secondary transition-colors duration-200 hover:border-admin-border-strong hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
      >
        Ver más detalles
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onPointerDown={(e) => {
          pressedOnBackdrop.current = e.target === ref.current;
        }}
        onClick={(e) => {
          if (e.target === ref.current && pressedOnBackdrop.current) ref.current?.close();
          pressedOnBackdrop.current = false;
        }}
        className="animate-dialog-in m-auto w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-xl border border-admin-border bg-admin-surface-raised p-0 text-admin-ink shadow-[0_24px_64px_-16px_rgba(11,17,32,0.4)] backdrop:bg-black/40"
      >
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-admin-border px-5 py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 id={titleId} className="text-base font-semibold text-admin-ink">
                {data.name}
              </h2>
              <span className="rounded-full bg-admin-surface-sunken px-2.5 py-1 text-[11px] font-semibold text-admin-ink-secondary">
                {data.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-admin-ink-secondary hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
            >
              Cerrar
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
            <section className="flex flex-col gap-2" aria-label="Datos">
              <h3 className={SECTION_TITLE}>Datos</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                <Field label="SKU" value={data.sku} mono />
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
                                  `${v.label || v.sku}${p.uniformQty === null ? ` × ${v.qtyRequired}` : ""}`,
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
          </div>

          <div className="flex justify-end border-t border-admin-border px-5 py-3">
            <Link
              href={`/admin/productos/insumos/${encodeURIComponent(data.sku)}`}
              className="inline-flex min-h-11 items-center rounded-lg bg-admin-accent px-3 py-2 text-sm font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
            >
              Editar, ajustar stock o eliminar
            </Link>
          </div>
        </div>
      </dialog>
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
