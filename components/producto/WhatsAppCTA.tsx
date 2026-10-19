"use client";

import { motion } from "framer-motion";
import { ChatIcon } from "@/components/ui/icons";
import { formatCop } from "@/lib/format";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { chipTransition, tapScale } from "@/components/motion/variants";

interface WhatsAppCTAProps {
  nombre: string;
  /** SKU de la variante elegida. */
  sku: string;
  /** Etiqueta de la variante elegida; se omite si el producto tiene una sola. */
  variante?: string;
  precioCop: number;
  vendible: boolean;
}

/**
 * Fase 1 no tiene carrito ni checkout: la compra es un enlace a WhatsApp con
 * mensaje prellenado que incluye la variante elegida. `vendible` viene de
 * `esVendible` / disponibilidad de la variante — una opción agotada no muestra
 * ningún camino de compra, ni siquiera deshabilitado con apariencia de botón.
 *
 * Es un enlace (`<a>`), nunca `disabled`, así que el press a 0.96 no necesita
 * exclusión de disabled. El icono va 2px más cerca del borde (`ps-5.5`/`pe-6`)
 * para compensar su peso visual (alineación óptica). Hover oscurece a
 * `moss-deep` (el `moss/90` anterior bajaba el contraste a 4.3:1).
 */
export function WhatsAppCTA({ nombre, sku, variante, precioCop, vendible }: WhatsAppCTAProps) {
  if (!vendible) {
    return (
      <div
        role="status"
        className="rounded-xl border border-ink/15 bg-ink/5 px-6 py-4 text-center font-body text-sm text-ink-muted"
      >
        Este producto no está disponible por ahora.
      </div>
    );
  }

  const detalle = variante ? ` — ${variante}` : "";
  const href = buildWhatsAppUrl(
    `Hola, quiero preguntar por "${nombre}"${detalle} (${sku}) — ${formatCop(precioCop)}.`,
  );

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={tapScale}
      transition={chipTransition}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-moss ps-5.5 pe-6 py-3.5 text-center font-body text-base font-medium text-cream transition-colors duration-150 ease-out hover:bg-moss-deep motion-reduce:transition-none sm:w-auto [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
    >
      <ChatIcon />
      Preguntar por WhatsApp
    </motion.a>
  );
}
