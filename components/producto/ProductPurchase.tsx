"use client";

import { motion } from "framer-motion";
import { useState, type MouseEvent } from "react";
import { DisponibilidadBadge } from "@/components/catalogo/DisponibilidadBadge";
import { useCartFeedback } from "@/components/cart/CartFeedbackProvider";
import { useCart } from "@/components/cart/CartProvider";
import { useAddedFeedback } from "@/components/cart/useAddedFeedback";
import { chipTransition, tapScale } from "@/components/motion/variants";
import { CartIcon } from "@/components/ui/icons";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { canAddToCart } from "@/lib/domain/cart";
import type { Disponibilidad, Producto } from "@/lib/domain/types";
import { formatCop } from "@/lib/format";

interface ProductPurchaseProps {
  producto: Producto;
}

/**
 * Hoja de cliente de la ficha: selector de variante + precio + disponibilidad +
 * adicionales (seleccionables, con cantidad) + CTA "Agregar al carrito". Es lo único que depende de la variante elegida, así que el
 * resto de la página (descripción, simbolismo, galería) sigue en servidor.
 *
 * Arranca en la primera variante vendible (la más barata) para que el
 * servidor y el cliente rendericen lo mismo y no haya salto de precio.
 *
 * La raíz es `display: contents`: sus hijos son hijos directos de la columna de
 * la ficha, y por eso el CTA puede ser `sticky` en móvil dentro de esa columna
 * (un `sticky` solo se mueve dentro de su padre inmediato). El CTA queda
 * pegado al borde inferior mientras se lee la ficha y vuelve a su sitio al
 * final; no hay JS, ni duplicado en el DOM, ni salto de layout.
 */
export function ProductPurchase({ producto }: ProductPurchaseProps) {
  const inicial =
    producto.variantes.find((v) => v.vendible) ?? producto.variantes[0];
  const [selectedId, setSelectedId] = useState(inicial.id);
  const variante =
    producto.variantes.find((v) => v.id === selectedId) ?? inicial;
  const varias = producto.variantes.length > 1;
  const { add, openDrawer } = useCart();
  const { play } = useCartFeedback();
  const [adicionales, setAdicionales] = useState<Record<string, number>>({});
  const { added, markAdded, liveRegion } = useAddedFeedback(producto.nombre);
  const vendible = canAddToCart(producto, variante);

  function handleAdd(event: MouseEvent<HTMLButtonElement>) {
    const ok = add({ producto, variante, adicionales, cantidad: 1 });
    if (!ok) return;
    setAdicionales({});
    markAdded();
    play({
      source: document.querySelector('[data-cart-source="gallery"]'),
      trigger: event.currentTarget,
      imageUrl: producto.imagenes[0]?.url,
      // TODO(ocasiones): Producto does not expose occasions yet. When it does,
      // pass isSoberOccasions(producto.ocasiones) so condolencias / acompañar /
      // recordar get the fade-only register.
      sober: false,
    });
  }
  // `Bajo pedido` se vende: la insignia lo conserva en vez de aplanarlo a "Disponible".
  const disponibilidadVariante: Disponibilidad = !variante.vendible
    ? "Agotado"
    : producto.disponibilidad === "Bajo pedido"
      ? "Bajo pedido"
      : "Disponible";

  return (
    <div className="contents">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display text-3xl text-ink">
          {formatCop(variante.precioCop)}
        </span>
        <DisponibilidadBadge disponibilidad={disponibilidadVariante} />
      </div>

      {varias && (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-body text-sm text-ink-muted">Presentación</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {producto.variantes.map((v) => {
              const active = v.id === variante.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedId(v.id)}
                  className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 font-body text-sm transition-[color,background-color,border-color,scale] duration-150 ease-out active:scale-[0.96] motion-reduce:transition-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss ${
                    active
                      ? "border-moss bg-moss text-cream"
                      : "border-ink/20 text-ink hover:border-moss hover:bg-moss/8"
                  } ${v.vendible ? "" : active ? "border-dashed" : "border-dashed text-ink-muted"}`}
                >
                  {v.etiqueta}
                  {!v.vendible && <span className="ml-2 text-xs">Agotado</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {producto.adicionales.length > 0 && vendible && (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-body text-sm text-ink-muted">Puedes agregar</legend>
          <ul className="flex flex-col divide-y divide-ink/10 font-body text-sm text-ink/80">
            {producto.adicionales.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 py-2">
                <span className="flex flex-col">
                  <span>{a.nombre}</span>
                  <span className="text-ink">+ {formatCop(a.precioCop)}</span>
                </span>
                <QuantityStepper
                  value={adicionales[a.id] ?? 0}
                  min={0}
                  max={a.maxCantidad}
                  label={`Cantidad de ${a.nombre}`}
                  onChange={(q) => setAdicionales((prev) => ({ ...prev, [a.id]: q }))}
                />
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {/* Móvil: barra pegada al borde inferior con fondo y respeto del área
          segura; `md:` vuelve al flujo normal. Los márgenes negativos igualan
          el `px-6` de la página para que el fondo llegue de borde a borde. */}
      <div className="sticky bottom-0 z-10 -mx-6 border-t border-ink/10 bg-cream/95 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        {vendible ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <motion.button
              type="button"
              onClick={handleAdd}
              whileTap={tapScale}
              transition={chipTransition}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-moss ps-5.5 pe-6 py-3.5 text-center font-body text-base font-medium text-cream transition-colors duration-150 ease-out hover:bg-moss-deep motion-reduce:transition-none sm:w-auto [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
            >
              <CartIcon />
              {added ? "Agregado" : "Agregar al carrito"}
            </motion.button>
            {added && (
              <motion.button
                type="button"
                onClick={openDrawer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={chipTransition}
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 font-body text-sm text-moss underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
              >
                Ver carrito
              </motion.button>
            )}
          </div>
        ) : (
          <div
            role="status"
            className="rounded-xl border border-ink/15 bg-ink/5 px-6 py-4 text-center font-body text-sm text-ink-muted"
          >
            Este producto no está disponible por ahora.
          </div>
        )}
        {/* Announces the add without moving focus. */}
        {liveRegion}
      </div>
    </div>
  );
}
