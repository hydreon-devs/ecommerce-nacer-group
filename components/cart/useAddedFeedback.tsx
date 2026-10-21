"use client";

import { useEffect, useState } from "react";

/** How long the "Agregado" confirmation stays before the normal label returns. */
const ADDED_MS = 2500;

/**
 * Shared add-to-cart feedback: a temporary `added` flag for the button label
 * plus a persistent polite live region that announces the add without moving
 * focus. Used by the product page and the listing cards so both behave alike.
 */
export function useAddedFeedback(nombre: string) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const id = window.setTimeout(() => setAdded(false), ADDED_MS);
    return () => window.clearTimeout(id);
  }, [added]);

  const liveRegion = (
    <p role="status" aria-live="polite" className="sr-only">
      {added ? `${nombre} agregado al carrito` : ""}
    </p>
  );

  return { added, markAdded: () => setAdded(true), liveRegion };
}
