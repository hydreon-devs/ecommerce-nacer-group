# Seguimiento de pedidos perdidos — diseño

**Fecha:** 2026-10-13 · **Estado:** Aprobado · **Ruta:** `/admin/perdidos`

## Objetivo

Dar seguimiento a los pedidos marcados como perdidos en Despachos: ver qué
pasó con cada uno, contactar al cliente y dejar registrado cómo se resolvió.

Pedidos ya lista los perdidos con `?estado=perdido`; esta página existe porque
agrega lo que Pedidos no tiene: el registro de la resolución.

## Acceso

La página **no** tiene entrada en el menú del encabezado. Se llega desde
Despachos, con un enlace "Pedidos perdidos" que muestra cuántos están por
resolver.

## Qué carga

Pedidos con `status = 'pagado'` y `fulfillment_status = 'perdido'`, sin límite
de mes, en dos grupos:

- **Por resolver:** `lost_resolution` nulo. El más antiguo primero por
  `lost_at`; los que no tienen `lost_at` van al principio.
- **Resueltos:** los 50 más recientes por `lost_resolved_at`.

## Cada pedido

| Dato | Origen |
|---|---|
| Orden | `orders.human_number`, con enlace a `/admin/pedidos/[id]` |
| Perdido el | `orders.lost_at` y hace cuántos días; "Fecha no registrada" si es nulo |
| Motivo | `orders.lost_reason`; "Sin motivo registrado" si es nulo |
| Productos | una línea por producto: nombre, SKU y cantidad |
| Total pagado | `orders.grand_total` |
| Comprador | nombre y teléfono |
| Destinatario | nombre, teléfono y dirección (`sale_details`) |
| Resolución | solo en Resueltos: qué se hizo, nota y fecha |

Un pedido puede estar perdido sin motivo ni fecha: el asistente de WhatsApp
también escribe la fase `perdido` y no envía esos datos.

## Resolver

"Resolver" abre un diálogo modal (`<dialog>` nativo) con:

| Campo | Valores |
|---|---|
| Qué se hizo (obligatorio) | `repuesto` · `reembolsado` · `cerrado_sin_accion` |
| Nota (opcional) | hasta 500 caracteres después de recortar espacios |

- La acción de servidor escribe `lost_resolution`, `lost_resolution_note` y
  `lost_resolved_at` solo si el pedido sigue pagado, perdido y sin resolución.
  Si cambió entre tanto, el diálogo lo informa y no escribe nada.
- La resolución se muestra también en el detalle del pedido.
- **Es solo un registro.** "Reembolsado" no devuelve dinero en Mercado Pago ni
  toca `payment_status`; "Repuesto" no crea un pedido. La fase sigue siendo
  `perdido`.
- Una resolución guardada no se edita en esta versión.

## Datos

Migración `add_lost_follow_up_to_orders`
(`docs/plans/2026-10-13-add-lost-follow-up.sql`):

- `orders.lost_at`: cuándo se marcó perdido. `updated_at` no sirve porque
  cambia con cualquier edición posterior. Los perdidos existentes se rellenan
  con su `updated_at`.
- `orders.lost_resolution`, `orders.lost_resolution_note`,
  `orders.lost_resolved_at`.

`markOrderLost` (Despachos) pasa a escribir también `lost_at`.

## Roles

La página muestra contacto del cliente y total pagado. Hoy todo el panel corre
como admin; cuando se activen los roles, `produccion` no debe tener acceso.

## Pruebas

Funciones puras con `node --test`: validación de la resolución y la nota,
regla de quién puede resolverse, separación y orden de los dos grupos, días
transcurridos desde la pérdida y armado de la vista.
