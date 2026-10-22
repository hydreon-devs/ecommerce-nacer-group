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
| 2 | **Delivery step** — `/checkout` step 1; see "Slice 2 detail" | availability re-check of cart lines, delivery calendar, Distance Matrix response parsing, delivery step schema |
| 3 | **Details step** | form schema (Zod) for the spec 015 fields, conditional invoice fields, phone formats |
| 4 | **Order creation** (server action + RPC `create_web_order`) | server-side re-pricing, total = subtotal + delivery fee, rejection of tampered or unsellable lines |
| 5 | **Mercado Pago preference** | preference payload: `external_reference = order_id`, excluded cash payment types, `notification_url` = n8n, back URLs, expiry aligned with the reservation |
| 6 | **Order detail page** | view model from order + reservations + payment state (`pendiente`, `en_proceso`, `aprobado`, `rechazado`) |
| 7 | **n8n check** | verify the n8n webhook relies only on `external_reference`; no web-specific branch |

## Stock: when it is held

Adding to the cart holds **nothing**. The cart lives only in the browser, and
holding stock per cart would let abandoned carts block unique pieces. Stock is
protected in three layers:

1. **Entering `/checkout`**: a non-reserving availability re-check, using fresh
   data and not the 5-minute catalog cache. Lines that became unsellable are
   flagged before the customer fills anything in.
2. **Summary → Pay (slice 4)**: `reserve_variant` per line. A failure is shown
   per product before any charge.
3. **Payment**: the MP preference `date_of_expiration` equals the reservation
   expiry, and `confirm_order` refuses expired reservations or short stock.
   Residual case: a PSE approved after expiry. n8n must alert the operator
   (slice 7). `Bajo pedido` lines consume no stock.

## Slice 2 detail

- **Earliest date: tomorrow.** The calendar runs from tomorrow up to 60 days,
  skipping days without `business_hours` and `holidays`, in `America/Bogota`.
  The server re-validates with `is_delivery_date` at order creation.
- **Methods**: `tienda` (pickup at the workshop, fee 0, date only) or
  `domicilio` (address, municipality of the metropolitan area, neighborhood,
  optional apartment/tower, date).
- **Address v1**: free text plus municipality, like n8n. No Places
  autocomplete, which can be added later without rework.
  - The server calls Google Distance Matrix from the workshop origin
    (`Cl. 35cc #8951, La América, Medellín, Antioquia, Colombia`, `driving`,
    `region=co`).
  - It parses the response with the same validations as n8n (spec 006).
  - The fee is computed by `quote_delivery` in the DB; tariff tiers are never
    duplicated in TS.
- **Confirmation**: the customer sees Google's resolved address and a static map
  and answers "¿Es aquí donde entregamos?". They cannot continue without
  confirming.
- **Ports and adapters**: a `DistanceProvider` port, with a Google adapter and a
  fake for tests.
- **Display only**: the fee shown here is display only. Slice 4 re-computes the
  distance and the fee server-side.
- **State**: checkout progress lives in `sessionStorage` and is never a source of
  truth.
- **Domain gap**: neither the schema nor `Producto` models `requiere_agenda` or
  preparation time, so there is no agenda path for now.

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
