"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "../actions";
import { ThemeToggle } from "./ThemeToggle";
import { focusRingClass, secondaryButtonClass } from "./ui/formClasses";

/** Menú de cuenta para móvil: correo, tema y cerrar sesión en un desplegable. */
export function AccountMenu({ email, initials }: { email: string; initials: string }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label="Cuenta"
        onClick={() => setOpen((v) => !v)}
        className={`grid h-11 w-11 place-items-center rounded-full ${focusRingClass}`}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-admin-accent text-xs font-bold text-admin-accent-ink">
          {initials || "?"}
        </span>
      </button>
      {open ? (
        <div
          id="account-menu"
          className="absolute right-0 top-full z-20 mt-2 flex w-64 flex-col gap-3 rounded-xl border border-admin-border bg-admin-surface-raised p-3 shadow-admin-card"
        >
          <p className="break-all text-sm text-admin-ink-secondary">{email}</p>
          <div className="flex items-center justify-between gap-3 text-sm text-admin-ink-secondary">
            Tema
            <ThemeToggle />
          </div>
          <form action={signOut}>
            <button type="submit" className={`w-full ${secondaryButtonClass}`}>
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
