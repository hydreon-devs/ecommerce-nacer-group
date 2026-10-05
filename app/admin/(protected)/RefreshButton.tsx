"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * `router.refresh()` vuelve a pedir los Server Components de la ruta actual
 * al servidor — no es un caché de Next.js el que hay que invalidar (las
 * consultas del panel van directo a Supabase vía `service_role`, sin pasar
 * por `fetch`), así que esto siempre trae el estado real de la base.
 */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [justRefreshed, setJustRefreshed] = useState(false);

  function handleClick() {
    startTransition(() => {
      router.refresh();
      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 1200);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="flex items-center gap-1.5 rounded-lg border border-admin-border bg-admin-surface-raised px-3 py-2 text-sm font-medium text-admin-ink-secondary transition-colors duration-200 hover:border-admin-border-strong hover:text-admin-ink disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-4 w-4 transition-transform duration-500 ${pending ? "animate-spin" : ""}`}
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 4v5h-5" />
      </svg>
      {justRefreshed ? "Actualizado" : "Actualizar"}
    </button>
  );
}
