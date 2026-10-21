"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { MouseEvent } from "react";
import { useCartFeedback } from "@/components/cart/CartFeedbackProvider";
import { useCart } from "@/components/cart/CartProvider";
import { useAddedFeedback } from "@/components/cart/useAddedFeedback";
import { chipTransition, tapScale } from "@/components/motion/variants";
import { CartIcon } from "@/components/ui/icons";
import { quickAddTarget } from "@/lib/domain/cart";
import type { Producto } from "@/lib/domain/types";

const BASE =
  "inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-center font-body text-sm font-medium transition-colors duration-150 ease-out motion-reduce:transition-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss";

/**
 * Compra rápida de una tarjeta de listado. La regla (qué se ofrece) vive en
 * `quickAddTarget`; aquí solo se pinta. Sin variante vendible no renderiza
 * ningún control: la insignia de disponibilidad ya dice "Agotado".
 *
 * Vive FUERA del `<a>` de la tarjeta (un control dentro de un enlace es HTML
 * inválido), así que pulsarlo no navega. No abre el cajón: confirma en sitio.
 */
export function QuickAdd({ producto }: { producto: Producto }) {
  const { add } = useCart();
  const { play } = useCartFeedback();
  const { added, markAdded, liveRegion } = useAddedFeedback(producto.nombre);
  const target = quickAddTarget(producto);

  if (target.kind === "none") return null;

  if (target.kind === "choose") {
    return (
      <Link
        href={`/catalogo/${producto.slug}`}
        className={`${BASE} border border-moss text-moss-deep hover:bg-moss/8`}
      >
        Elegir opción
        <span className="sr-only"> de {producto.nombre}</span>
      </Link>
    );
  }

  function handleAdd(event: MouseEvent<HTMLButtonElement>) {
    if (target.kind !== "add") return;
    if (!add({ producto, variante: target.variante, cantidad: 1 })) return;
    markAdded();
    play({
      source: event.currentTarget.closest("article")?.querySelector("[data-cart-source]") ?? null,
      trigger: event.currentTarget,
      imageUrl: producto.imagenes[0]?.url,
      // TODO(ocasiones): Producto does not expose occasions yet. When it does,
      // pass isSoberOccasions(producto.ocasiones) so condolencias / acompañar /
      // recordar get the fade-only register.
      sober: false,
    });
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={handleAdd}
        whileTap={tapScale}
        transition={chipTransition}
        className={`${BASE} bg-moss text-cream hover:bg-moss-deep`}
      >
        <CartIcon width={18} height={18} aria-hidden="true" />
        {added ? (
          "Agregado"
        ) : (
          <>
            Agregar<span className="max-sm:sr-only">&nbsp;al carrito</span>
            <span className="sr-only"> {producto.nombre}</span>
          </>
        )}
      </motion.button>
      {liveRegion}
    </>
  );
}
