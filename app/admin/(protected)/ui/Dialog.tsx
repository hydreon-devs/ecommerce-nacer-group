"use client";

import { useEffect, useId, useRef } from "react";
import { dialogButtonClass } from "./formClasses";

const SIZE_CLASS = { sm: "max-w-sm", md: "max-w-md", xl: "max-w-xl" } as const;

/**
 * Diálogo modal sobre el `<dialog>` nativo: el navegador atrapa el foco, Escape
 * cierra y el foco vuelve al elemento que lo abrió (el disparador). Controlado:
 * `open` lo decide quien lo usa y `onClose` se llama con Escape, el botón
 * "Cerrar" o un clic en el fondo. Con `busy` (guardando) nada de eso cierra.
 *
 * Estructura: encabezado (título + insignia opcional + descripción), cuerpo con
 * scroll propio (`overscroll-contain`) y pie opcional. Un formulario va en el
 * cuerpo y su botón de envío en el pie, enlazado con el atributo `form`.
 */
export function Dialog({
  open,
  onClose,
  title,
  titleClassName = "text-base font-semibold text-admin-ink",
  badge,
  description,
  size = "md",
  busy = false,
  hideClose = false,
  bodyClassName = "gap-4",
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  titleClassName?: string;
  badge?: React.ReactNode;
  description?: string;
  size?: keyof typeof SIZE_CLASS;
  busy?: boolean;
  /** Oculta "Cerrar" cuando el pie ya trae su propio "Cancelar". */
  hideClose?: boolean;
  bodyClassName?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Dónde empezó el clic: soltar tras arrastrar (p. ej. seleccionar texto) sobre
  // el fondo no debe cerrar el diálogo.
  const pressedOnBackdrop = useRef(false);
  const titleId = useId();
  const descId = useId();
  const hasBody = children != null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        // Escape: se cierra desde el estado, no a medio guardado.
        e.preventDefault();
        if (!busy) onClose();
      }}
      onPointerDown={(e) => {
        pressedOnBackdrop.current = e.target === ref.current;
      }}
      onClick={(e) => {
        // Sin padding propio: un clic directo sobre el <dialog> es el fondo.
        if (e.target === ref.current && pressedOnBackdrop.current && !busy) onClose();
        pressedOnBackdrop.current = false;
      }}
      className={`animate-dialog-in m-auto w-[calc(100%-2rem)] ${SIZE_CLASS[size]} overflow-hidden overscroll-contain rounded-xl border border-admin-border bg-admin-surface-raised p-0 text-admin-ink shadow-admin-overlay backdrop:bg-black/40`}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div
          className={`flex items-start justify-between gap-3 px-5 ${hasBody ? "border-b border-admin-border py-3" : "pb-2 pt-5"}`}
        >
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={titleId} className={titleClassName}>
                {title}
              </h2>
              {badge}
            </div>
            {description ? (
              <p id={descId} className="text-sm text-admin-ink-secondary">
                {description}
              </p>
            ) : null}
          </div>
          {hideClose ? null : (
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className={`${dialogButtonClass} shrink-0 text-admin-ink-secondary hover:text-admin-ink`}
            >
              Cerrar
            </button>
          )}
        </div>

        {hasBody ? (
          <div className={`flex flex-1 flex-col overflow-y-auto overscroll-contain px-5 py-5 ${bodyClassName}`}>
            {children}
          </div>
        ) : null}

        {footer ? (
          <div
            className={`flex justify-end gap-2 px-5 ${hasBody ? "border-t border-admin-border py-3" : "pb-5 pt-2"}`}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
