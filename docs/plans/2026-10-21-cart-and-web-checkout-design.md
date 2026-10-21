# Cart and web checkout — design

Date: 2026-10-21 · Status: approved

## Goal

Replace the per-product "Preguntar por WhatsApp" CTA with a real cart and a
Mercado Pago Checkout Pro payment. The header WhatsApp link stays as the general
contact channel (`lib/whatsapp.ts`).

## Decisions

| Topic | Decision |
|---|---|
| Payment webhook | Reuse the **existing n8n Mercado Pago webhook**. Next.js creates the order and the preference; `notification_url` points to n8n, which validates `x-signature`, verifies against the MP API and calls `confirm_order`. One reconciliation pipeline for both channels. |
| Payment methods | **Card and PSE only.** Cash (Efecty, etc.) is excluded from the preference, which resolves the 30–60 min reservation vs. multi-day cash conflict. |
| Delivery fee | Google Maps: Places autocomplete in the browser and server-side distance calculation, then `quote_delivery(p_distance_m)`. Same tariff as WhatsApp. |
| Customer data | The WhatsApp post-payment form (assistant spec 015) is rebuilt **before payment**. A web buyer is anonymous, so there is no channel to ask for it afterwards. |
| Order identity | Synthetic `chat_id = 'web:<uuid>'`, the same pattern as `create_panel_sale` (`'panel:'`). |
| Order detail | A public, unguessable order page shows the items bought and the amounts charged. It only **reads** the payment state; it never marks an order as paid (invariant 2). |

## Flow

```
Product page ──add──▶ Cart ──▶ 1. Delivery ──▶ 2. Your details ──▶ 3. Summary ──▶ Mercado Pago ──▶ Order detail
                                  │                 │                    │                              ▲
                     pickup or delivery     buyer, recipient,   server re-prices,                      │
                     confirmed address      card message,       reserves stock,               n8n webhook
                     valid delivery date    invoice             creates preference            confirm_order
```

1. **Delivery**: pickup or home delivery. For home delivery the Places address
   is confirmed by the customer ("¿Es aquí donde entregamos?") on a static map,
   plus apartment/tower and neighborhood. The delivery date must satisfy
   `is_delivery_date` (no Sundays or holidays) and the preparation time.
   Experience items (`requiere_agenda`) ask for a date, not an address.
2. **Your details**: the spec 015 fields, plus occasion and card message,
   because the web has no conversation where they get asked. Buyer name and
   phone, recipient name and phone, call permission, invoice fields.
3. **Summary**: totals come from the **server**, never from the client cart.
   The server re-reads prices, runs `reserve_variant` per line, `set_delivery`,
   stores sale details and creates the preference.

## Slices (each one TDD: failing test first, then the code)

| # | Slice | Pure logic under test (`lib/domain/*.test.ts`, `node --test`) |
|---|---|---|
| 1 | **Cart** — add-to-cart replaces `WhatsAppCTA`; cart drawer/page; persisted in `localStorage` | line identity (variant + adicionales), add/merge, quantity bounds, adicionales `maxCantidad`, remove, subtotal in integer COP, `esVendible` gate, safe deserialization of stored state |
| 2 | **Delivery step** | delivery-mode resolution for mixed carts (physical → address, agendable → date), delivery-date validation, address confirmation state |
| 3 | **Details step** | form schema (Zod) for the spec 015 fields, conditional invoice fields, phone formats |
| 4 | **Order creation** (server action + RPC `create_web_order`) | server-side re-pricing, total = subtotal + delivery fee, rejection of tampered or unsellable lines |
| 5 | **Mercado Pago preference** | preference payload: `external_reference = order_id`, excluded cash payment types, `notification_url` = n8n, back URLs, expiry aligned with the reservation |
| 6 | **Order detail page** | view model from order + reservations + payment state (`pendiente`, `en_proceso`, `aprobado`, `rechazado`) |
| 7 | **n8n check** | verify the n8n webhook relies only on `external_reference`; no web-specific branch |

## Open decisions (`TODO(decisión)`)

- **Invoice and bank accounts**: spec 015 RF-20 says the business uses two bank
  accounts depending on invoicing. With Mercado Pago everything lands in one
  account. Confirm with the owner.
- **Abandoned checkouts**: sale details are stored before payment. They need a
  retention policy for orders that expire unpaid.
- **Experience items and `Fecha coordinada`**: `requiere_agenda` stays per
  product, as `nacer-dominio` states.

## Non-goals

Customer accounts, cash payments, coupons, national shipping, and a Next.js
payment webhook.
