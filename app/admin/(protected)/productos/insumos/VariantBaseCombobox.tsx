"use client";

import { useEffect, useId, useRef, useState } from "react";
import { filterVariantBases, type VariantBaseOption } from "@/lib/domain/stockItemCreate";
import { inputClass, labelClass } from "../../ui/formClasses";

/**
 * Buscador en tiempo real del insumo base de una variante (patrón combobox de
 * ARIA). Envía el id elegido en el campo oculto `variantOf`; mientras no se
 * elija una opción de la lista, el formulario no se puede enviar.
 */
export function VariantBaseCombobox({
  options,
  value,
  onChange,
}: {
  options: VariantBaseOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.id === value);
  const [query, setQuery] = useState(selected ? label(selected) : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = selected ? [] : filterVariantBases(options, query);
  const showList = open && !selected && query.trim() !== "";

  useEffect(() => {
    inputRef.current?.setCustomValidity(value ? "" : "Elige el insumo base de la lista.");
  }, [value]);

  function choose(option: VariantBaseOption) {
    onChange(option.id);
    setQuery(label(option));
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!showList) return setOpen(true);
      if (results.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + results.length) % results.length);
    } else if (e.key === "Enter" && showList) {
      // Enter elige la opción activa en vez de enviar el formulario.
      e.preventDefault();
      const option = results[active];
      if (option) choose(option);
    } else if (e.key === "Escape" && showList) {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={labelClass}>
        Insumo base
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          value={query}
          placeholder="Escribe el SKU o el nombre…"
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
            // Editar el texto deshace la elección: hay que volver a elegir de la lista.
            if (value) onChange("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className={`${inputClass} w-full`}
        />
        <input type="hidden" name="variantOf" value={value} />
        {showList ? (
          <ul
            id={listId}
            role="listbox"
            aria-label="Insumos base"
            className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-admin-border bg-admin-surface-raised py-1 shadow-admin-card"
          >
            {results.length === 0 ? (
              <li role="option" aria-selected={false} aria-disabled="true" className="px-3 py-2 text-sm text-admin-ink-muted">
                Sin coincidencias
              </li>
            ) : (
              results.map((option, i) => (
                <li
                  key={option.id}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // mousedown en vez de click: elige antes de que el blur cierre la lista.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(option);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm text-admin-ink ${
                    i === active ? "bg-admin-surface-sunken" : ""
                  }`}
                >
                  <span className="font-mono text-xs text-admin-ink-muted tabular-nums">{option.sku}</span>
                  <span>{option.name}</span>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function label(option: VariantBaseOption): string {
  return `${option.sku} — ${option.name}`;
}
