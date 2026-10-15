import Link from "next/link";

/** 404 dentro del panel: lo dispara `notFound()` cuando el pedido, producto o insumo no existe. */
export default function AdminNotFound() {
  return (
    <div className="animate-view-in mx-auto flex max-w-md flex-col gap-4 py-16 text-center">
      <h1 className="text-xl font-bold tracking-tight text-admin-ink">No encontramos esto</h1>
      <p className="text-sm text-admin-ink-secondary">
        El pedido, producto o insumo que buscas no existe o ya no está disponible.
      </p>
      <div className="flex justify-center">
        <Link
          href="/admin/pedidos"
          className="inline-flex min-h-11 items-center rounded-lg bg-admin-accent px-4 py-2 text-sm font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
        >
          Ir a Pedidos
        </Link>
      </div>
    </div>
  );
}
