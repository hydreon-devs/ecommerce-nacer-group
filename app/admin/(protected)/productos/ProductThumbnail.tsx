"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * `page.tsx` es un Server Component — un `onError` no se puede pasar como
 * prop de servidor a cliente, así que esta pieza mínima vive aparte. Evita
 * que una `image_url` rota (archivo borrado del bucket sin actualizar la
 * fila) tumbe la página completa — solo cae al placeholder vacío.
 */
export function ProductThumbnail({ url, alt }: { url: string | null; alt: string }) {
  const [broken, setBroken] = useState(false);

  if (!url || broken) {
    return (
      <span className="absolute inset-0 grid place-items-center text-admin-ink-muted">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </span>
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes="64px"
      className="object-cover outline outline-1 -outline-offset-1 outline-admin-ink/10"
      onError={() => setBroken(true)}
    />
  );
}
