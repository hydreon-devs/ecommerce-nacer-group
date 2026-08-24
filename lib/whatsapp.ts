import { WHATSAPP_NUMBER } from "./config";

/**
 * Construye el enlace de contacto por WhatsApp con mensaje prellenado.
 *
 * Único lugar donde se arma la URL: el número vive en `lib/config.ts` y el
 * formato `wa.me` no se repite en ningún componente. Fase 1 no tiene carrito,
 * así que este enlace es el camino de compra real — cuando exista checkout,
 * seguirá siendo el canal de contacto, no de pago.
 */
export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Mensaje genérico del botón de contacto del header (sin producto asociado). */
export const WHATSAPP_GENERAL_MESSAGE =
  "Hola, quiero preguntar por los productos de Crisálidas y Mariposas.";
