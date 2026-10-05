# 0003 — `fulfillment_status` como columna en `orders`, no tabla de historial

**Fecha:** 2026-09-11 · **Estado:** Aceptada · **Spec relacionada:** `specs/002_mvp_panel_administracion`

## Contexto

El Excel operativo del cliente rastrea una fase de cumplimiento (en construcción → en
despacho → entregado, o perdido) que no existía en ningún lado de Supabase. `orders.status`
del esquema real (verificado contra la base, no contra la skill `nacer-dominio`, que describe
un esquema aspiracional nunca implementado) solo tiene `abierto/pagado/vencido/cancelado` —
el ciclo de vida del **pago**, no de la **producción física** del pedido.

`spec.md` de 002 §2.3 presentó tres opciones al usuario: (A) columna nueva en `orders`, (B)
tabla aparte `order_fulfillment` (con o sin historial de cambios), (C) ampliar el enum de
`orders.status` para incluir las fases nuevas.

## Decisión

Opción A. Columna `orders.fulfillment_status`, nullable, `CHECK IN
('en_construccion','en_despacho','entregado','perdido')`, sin `DEFAULT` (nace `NULL`
mientras el pedido no está `pagado`). Sin tabla de historial en este ciclo.

La Opción C se descartó explícitamente, no solo por preferencia: colapsar pago y
cumplimiento en un solo enum viola la invariante 3 de `CLAUDE.md` de este repositorio ("tres
dimensiones de estado independientes... nunca colapsarlas en un solo campo") y el artículo 10
de la constitución del repositorio del agente (separación de responsabilidades). Un pedido
puede estar `pagado` y `perdido` en tránsito al mismo tiempo — un solo enum no puede
representar ese hecho sin inventar un valor combinado.

## Alternativas consideradas

**Opción B (tabla aparte).** Da historial de cambios gratis si se modela como log de
eventos, y separa limpio "estado del pago" de "estado del negocio". Se descartó para este
ciclo porque el usuario no pidió trazabilidad de quién cambió qué y cuándo — solo la fase
actual, visible y editable. Queda como el camino natural si el negocio pide ese historial más
adelante (ver ADR 0003 §Consecuencias).

## Consecuencias

- `orders.updated_at` es lo único que cambia cuando se actualiza `fulfillment_status` — no
  hay registro de quién lo cambió ni de las fases intermedias por las que pasó un pedido.
- Ninguna RPC del agente de WhatsApp toca esta columna — la escribe únicamente
  `setFulfillmentStatus` (Server Action del panel), que además valida que el pedido esté
  `pagado` antes de aceptar el cambio (no tiene sentido "en despacho" sobre un pedido
  `abierto` o `cancelado`).
- Si el negocio pide después "¿cuánto tardamos en producir en promedio?" o "¿quién marcó
  este pedido como perdido?", la respuesta es migrar a la Opción B — un cambio aditivo, no
  una reescritura.
