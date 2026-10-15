"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  SEARCH_MAX_LENGTH,
  isExternalTermChange,
  normalizeSearchTerm,
  withParam,
} from "@/lib/domain/orderSearch";

const DEBOUNCE_MS = 300;

/**
 * Búsqueda por número de pedido. El término vive en la URL (`?q=`, junto a
 * `?mes=&anio=`) y el servidor consulta la base: filtrar solo las filas en
 * pantalla no encontraría un pedido fuera de las primeras 50. Teclear aplica
 * tras una pausa corta y reemplaza la entrada del historial (el botón Atrás no
 * se llena de pulsaciones); Enter aplica de inmediato. La URL se lee al
 * momento de navegar, así que conserva el periodo aunque haya cambiado entre
 * pulsaciones.
 */
export function OrderSearch({ q }: { q: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const urlTerm = q ?? "";
  const [text, setText] = useState(urlTerm);
  // Último término que este componente envió y último que trajo la URL: juntos
  // distinguen un cambio externo (p. ej. "Limpiar filtros") de la respuesta a
  // lo que el usuario acaba de teclear, que no debe pisar el texto del campo.
  const [sent, setSent] = useState(urlTerm);
  const [seen, setSeen] = useState(urlTerm);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (urlTerm !== seen) {
    setSeen(urlTerm);
    if (isExternalTermChange(urlTerm, seen, sent)) {
      setSent(urlTerm);
      setText(urlTerm);
    }
  }

  useEffect(() => () => clearTimer(), []);

  function clearTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function apply(raw: string) {
    clearTimer();
    const next = normalizeSearchTerm(raw) ?? "";
    setText(next);
    if (next === sent) return;
    setSent(next);
    startTransition(() => {
      router.replace(withParam(`${pathname}${window.location.search}`, "q", next));
    });
  }

  function onChange(raw: string) {
    setText(raw);
    clearTimer();
    timer.current = setTimeout(() => apply(raw), DEBOUNCE_MS);
  }

  return (
    <form
      role="search"
      aria-label="Buscar pedidos"
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        apply(text);
      }}
      className={`flex flex-col gap-1 transition-opacity duration-150 ${pending ? "opacity-60" : ""}`}
    >
      <label htmlFor="order-search" className="text-xs text-admin-ink-muted">
        N° de pedido
      </label>
      <div className="relative">
        <input
          id="order-search"
          type="search"
          value={text}
          maxLength={SEARCH_MAX_LENGTH}
          autoComplete="off"
          spellCheck={false}
          placeholder="Ej. 0007"
          aria-label="Buscar por número de pedido"
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 w-44 rounded-lg border border-admin-border bg-admin-surface-raised py-2 pl-3 pr-11 font-admin-mono text-base sm:text-sm text-admin-ink-secondary transition-colors duration-150 placeholder:font-sans placeholder:text-admin-ink-muted hover:border-admin-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent [&::-webkit-search-cancel-button]:hidden"
        />
        {text !== "" ? (
          <button
            type="button"
            aria-label="Quitar búsqueda"
            onClick={() => apply("")}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-admin-ink-muted transition-colors duration-150 hover:text-admin-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-admin-accent"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        ) : null}
      </div>
      <span role="status" className="sr-only">
        {pending ? "Buscando pedidos…" : ""}
      </span>
    </form>
  );
}
