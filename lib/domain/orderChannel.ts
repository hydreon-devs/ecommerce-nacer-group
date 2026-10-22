/**
 * Where an order came from, read from `orders.chat_id`:
 *  - `panel:<uuid>`: sold by an advisor from the admin panel;
 *  - `web:<attempt_id>`: created by the storefront checkout;
 *  - anything else: the customer's WhatsApp id (a phone or a BSUID).
 */
export type OrderChannel = "panel" | "web" | "whatsapp";

export function orderChannel(chatId: string | null | undefined): OrderChannel {
  if (typeof chatId !== "string") return "whatsapp";
  if (chatId.startsWith("panel:")) return "panel";
  if (chatId.startsWith("web:")) return "web";
  return "whatsapp";
}

/**
 * Panel and web orders carry a synthetic `chat_id`, not a phone: the buyer's
 * real number lives in `sale_details.buyer_phone`.
 */
export function hasSyntheticChat(chatId: string | null | undefined): boolean {
  return orderChannel(chatId) !== "whatsapp";
}

const LABELS: Record<OrderChannel, string> = { panel: "Panel", web: "Web", whatsapp: "WhatsApp" };

export function channelLabel(channel: OrderChannel): string {
  return LABELS[channel];
}
