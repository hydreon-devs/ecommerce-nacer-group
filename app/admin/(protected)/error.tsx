"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Límite de error de las secciones del panel. Vive dentro del layout
 * protegido (error.js no envuelve el layout de su propio segmento), así que
 * la navegación sigue visible. `retry` vuelve a pedir y renderizar el segmento.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="animate-view-in mx-auto flex max-w-md flex-col gap-4 py-16 text-center">
      <h1 className="text-xl font-bold tracking-tight text-admin-ink">Algo salió mal</h1>
      <p className="text-sm text-admin-ink-secondary">
        No pudimos cargar esta sección. Puede ser un fallo temporal: inténtalo de nuevo y, si
        sigue pasando, vuelve a Pedidos.
      </p>
      {error.digest ? (
        <p className="font-admin-mono text-xs text-admin-ink-muted">Referencia: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="min-h-11 rounded-lg bg-admin-accent px-4 py-2 text-sm font-medium text-admin-accent-ink transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
        >
          Reintentar
        </button>
        <Link
          href="/admin/pedidos"
          className="inline-flex min-h-11 items-center rounded-lg border border-admin-border bg-admin-surface-raised px-4 py-2 text-sm font-medium text-admin-ink-secondary transition-colors duration-200 hover:border-admin-border-strong hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
        >
          Ir a Pedidos
        </Link>
      </div>
    </div>
  );
}
