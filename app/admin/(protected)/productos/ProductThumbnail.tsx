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

  if (!url || broken) return null;

  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes="64px"
      className="object-cover"
      onError={() => setBroken(true)}
    />
  );
}
