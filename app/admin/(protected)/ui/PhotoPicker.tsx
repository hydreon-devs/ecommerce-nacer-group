"use client";

import { useEffect, useId, useRef, useState } from "react";
import { validateImageFile } from "@/lib/domain/imageUpload";
import { ActionStatus, type StatusMessage } from "./ActionStatus";
import { labelClass, secondaryButtonClass } from "./formClasses";

/** Foto opcional al crear: el archivo viaja en el mismo FormData (`photo`). */
export function PhotoPicker({ className = "" }: { className?: string }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // React reinicia el formulario tras la acción (también si falla) y vacía el input: la vista previa debe seguirlo.
  useEffect(() => {
    const form = inputRef.current?.form;
    const onReset = () => setPreviewUrl(null);
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, []);

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setPreviewUrl(null);
  }

  function onPick(file: File | undefined) {
    setMessage(null);
    if (!file) return clear();
    const check = validateImageFile(file);
    if (!check.ok) {
      clear();
      setMessage({ tone: "error", text: check.error });
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  }

  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-admin-surface-sunken">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:), no optimizable
          <img src={previewUrl} alt="Vista previa de la foto" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className={labelClass}>
          Foto (opcional)
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          name="photo"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => onPick(e.target.files?.[0])}
          className="min-h-11 text-sm text-admin-ink-secondary file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-lg file:border file:border-admin-border file:bg-admin-surface-raised file:px-3 file:text-sm file:font-medium file:text-admin-ink-secondary"
        />
        {previewUrl ? (
          <button type="button" onClick={clear} className={`${secondaryButtonClass} self-start`}>
            Quitar foto
          </button>
        ) : null}
        <ActionStatus message={message} />
      </div>
    </div>
  );
}
