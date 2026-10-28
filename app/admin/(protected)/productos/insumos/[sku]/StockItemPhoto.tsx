"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { ActionStatus, type StatusMessage } from "../../../ui/ActionStatus";
import { ConfirmDialog } from "../../../ui/ConfirmDialog";
import { labelClass, secondaryButtonClass } from "../../../ui/formClasses";
import { removeStockItemImage, uploadStockItemImage } from "../actions";

export function StockItemPhoto({
  itemId,
  name,
  imageUrl: initialUrl,
}: {
  itemId: string;
  name: string;
  imageUrl: string | null;
}) {
  const router = useRouter();
  const inputId = useId();
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [broken, setBroken] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    setMessage({ tone: "ok", text: "Subiendo imagen…" });
    startTransition(async () => {
      try {
        const res = await uploadStockItemImage(itemId, fd);
        if (res.ok) {
          setImageUrl(res.url);
          setBroken(false);
          setMessage({ tone: "ok", text: "Imagen actualizada" });
          router.refresh();
        } else {
          setMessage({ tone: "error", text: res.error });
        }
      } catch {
        setMessage({ tone: "error", text: "No se pudo subir la imagen. Inténtalo de nuevo." });
      }
    });
  }

  function remove() {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await removeStockItemImage(itemId);
        if (res.ok) {
          setImageUrl(null);
          setBroken(false);
          setMessage({ tone: "ok", text: "Imagen eliminada" });
          router.refresh();
        } else {
          setMessage({ tone: "error", text: res.error });
        }
      } catch {
        setMessage({ tone: "error", text: "No se pudo eliminar la imagen. Inténtalo de nuevo." });
      }
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-admin-ink">Foto</h2>
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-transparent bg-admin-surface-raised p-3 shadow-admin-card">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-admin-surface-sunken">
          {imageUrl && !broken ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="96px"
              className="object-cover"
              onError={() => setBroken(true)}
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={inputId} className={labelClass}>
            Imagen
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
            className="min-h-11 text-sm text-admin-ink-secondary file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-lg file:border file:border-admin-border file:bg-admin-surface-raised file:px-3 file:text-sm file:font-medium file:text-admin-ink-secondary"
          />
          {imageUrl ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(true)}
              className={`${secondaryButtonClass} self-start`}
            >
              Eliminar foto
            </button>
          ) : null}
        </div>
        <ActionStatus message={message} className="w-full text-sm" />
      </div>
      <ConfirmDialog
        open={confirming}
        title="¿Eliminar la foto?"
        description={`Se borrará la imagen de ${name}. Podrás subir otra cuando quieras.`}
        confirmLabel="Eliminar"
        tone="danger"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          remove();
        }}
      />
    </section>
  );
}
