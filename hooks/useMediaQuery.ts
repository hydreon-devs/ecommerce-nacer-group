"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Suscripción a una media query.
 *
 * El snapshot de servidor es siempre `false`: el servidor no conoce el
 * viewport y el proyecto es mobile-first, así que "no cumple" es la respuesta
 * segura. El primer render de cliente coincide con el del servidor y el valor
 * real llega en el commit.
 *
 * De ahí la regla de uso: **el layout nunca debe depender de este hook, solo
 * el comportamiento.** Los tamaños se resuelven con los prefijos responsive de
 * Tailwind, que son CSS puro y aciertan desde el primer pintado. Si una clase
 * de alto o de posición saliera de aquí, el escritorio pintaría un frame con
 * la geometría de móvil y saltaría al hidratar.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onStoreChange);
      return () => list.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
