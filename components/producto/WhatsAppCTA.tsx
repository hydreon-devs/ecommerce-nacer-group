"use client";

import { motion } from "framer-motion";
import type { Producto } from "@/lib/domain/types";
import { esVendible } from "@/lib/domain/esVendible";
import { formatCop } from "@/lib/format";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { chipTransition, tapScale } from "@/components/motion/variants";

interface WhatsAppCTAProps {
  producto: Producto;
}

/**
 * Fase 1 no tiene carrito ni checkout: la compra es un enlace a WhatsApp con
 * mensaje prellenado. Pasa siempre por `esVendible` — un producto `Agotado`
 * (o inactivo) no debe mostrar ningún camino de compra, ni siquiera
 * deshabilitado con apariencia de botón.
 */
export function WhatsAppCTA({ producto }: WhatsAppCTAProps) {
  if (!esVendible(producto)) {
    return (
      <div
        role="status"
        className="rounded-xl border border-ink/15 bg-ink/5 px-6 py-4 text-center font-body text-sm text-ink/60"
      >
        Este producto no está disponible por ahora.
      </div>
    );
  }

  const href = buildWhatsAppUrl(
    `Hola, quiero preguntar por "${producto.nombre}" (${producto.sku}) — ${formatCop(producto.precioCop)}.`,
  );

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={tapScale}
      transition={chipTransition}
      className="inline-flex w-full items-center justify-center rounded-xl bg-moss px-6 py-4 text-center font-body text-base font-medium text-cream transition-colors hover:bg-moss/90 sm:w-auto"
    >
      Preguntar por WhatsApp
    </motion.a>
  );
}
