"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { DURATION_UI, EASE_UI } from "@/components/motion/variants";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/ui/icons";
import type { ImagenProducto } from "@/lib/domain/types";

interface ImageLightboxProps {
  imagenes: ImagenProducto[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/**
 * Vista ampliada de la galería. Usa `<dialog>` nativo con `showModal()`: el
 * navegador ya resuelve la capa superior, el fondo inerte, el foco atrapado y
 * Escape (vía `onCancel`). Flechas izquierda/derecha cambian de imagen; el
 * scroll de la página se bloquea mientras está abierto (y `overscroll-contain`
 * evita que el gesto se encadene a la página en táctil).
 *
 * Movimiento: el fundido de la imagen es opacidad + una escala mínima (0.98);
 * `MotionConfig reducedMotion="user"` (layout) quita la escala y deja el
 * fundido. Los botones transicionan solo color y escala, con press a 0.96.
 */
export function ImageLightbox({ imagenes, index, onIndexChange, onClose }: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = index !== null;
  const total = imagenes.length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousOverflow;
    };
  }, [open]);

  if (total === 0) return null;
  const current = index !== null ? imagenes[index] : null;
  const go = (delta: number) => {
    if (index === null) return;
    onIndexChange((index + delta + total) % total);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label="Imagen ampliada del producto"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (total < 2) return;
        if (event.key === "ArrowRight") go(1);
        if (event.key === "ArrowLeft") go(-1);
      }}
      // Clic en el fondo (fuera de la imagen y los controles) cierra.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-0 h-dvh max-h-none w-dvw max-w-none overscroll-contain bg-ink/90 p-0 opacity-100 transition-opacity duration-200 ease-out backdrop:bg-transparent open:starting:opacity-0 motion-reduce:transition-none"
    >
      {current && (
        <div
          className="relative flex h-full w-full items-center justify-center p-4 md:p-12"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: DURATION_UI, ease: EASE_UI }}
            className="relative h-full w-full max-w-5xl overflow-hidden rounded-2xl bg-white"
          >
            <Image
              src={current.url}
              alt={current.alt}
              fill
              sizes="100vw"
              className="rounded-2xl object-contain p-4 outline outline-1 -outline-offset-1 outline-black/10 md:p-8"
            />
          </motion.div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar imagen ampliada"
            className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-cream text-ink transition-[background-color,scale] duration-150 ease-out hover:bg-white enabled:active:scale-[0.96] motion-reduce:transition-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream md:top-6 md:right-6"
          >
            <CloseIcon />
          </button>

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Imagen anterior"
                className="absolute top-1/2 left-4 -translate-y-1/2 flex size-11 items-center justify-center rounded-full bg-cream text-ink transition-[background-color,scale] duration-150 ease-out hover:bg-white enabled:active:scale-[0.96] motion-reduce:transition-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream md:left-6"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Imagen siguiente"
                className="absolute top-1/2 right-4 -translate-y-1/2 flex size-11 items-center justify-center rounded-full bg-cream text-ink transition-[background-color,scale] duration-150 ease-out hover:bg-white enabled:active:scale-[0.96] motion-reduce:transition-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream md:right-6"
              >
                <ChevronRightIcon />
              </button>
              <p
                aria-live="polite"
                className="absolute bottom-4 rounded-full bg-cream px-3 py-1 font-body text-xs tabular-nums text-ink md:bottom-6"
              >
                {(index ?? 0) + 1} / {total}
              </p>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
