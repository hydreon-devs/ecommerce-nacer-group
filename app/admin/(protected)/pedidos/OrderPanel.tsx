import Link from "next/link";
import { DASH, type OrderFieldGroup } from "./orderView";

/**
 * Contenido del panel expandido de un pedido: el resumen en tres grupos y el
 * enlace al detalle, donde está el resto. Presentacional — los valores ya
 * vienen formateados desde `orderView.ts`.
 */
export function OrderPanel({
  orderId,
  groups,
  openHref,
}: {
  orderId: string;
  groups: OrderFieldGroup[];
  openHref: string;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-admin-border bg-admin-surface-sunken px-4 py-4">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={`${group.id}-${orderId}`} className="min-w-0">
            <h3
              id={`${group.id}-${orderId}`}
              className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-admin-ink-muted"
            >
              {group.title}
            </h3>
            <dl className="flex flex-col gap-2 text-sm">
              {group.fields.map((field) => (
                <div key={field.key}>
                  <dt className="text-xs text-admin-ink-muted">{field.label}</dt>
                  <dd
                    className={`whitespace-pre-wrap break-words ${
                      field.value === DASH ? "text-admin-ink-muted" : "text-admin-ink-secondary"
                    } ${field.mono ? "font-admin-mono" : ""}`}
                  >
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <Link
        href={openHref}
        className="inline-flex min-h-11 items-center self-start text-sm font-medium text-admin-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
      >
        Abrir pedido
      </Link>
    </div>
  );
}
