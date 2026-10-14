# Rediseño de Despachos — diseño

**Fecha:** 2026-10-13 · **Estado:** Aprobado · **Ruta:** `/admin/despachos`

## Objetivo

Quien despacha abre el panel y ve qué sale hoy, con el detalle de productos de
cada pedido. Puede consultar los listos de otros días, ve siempre todo lo que
está en camino y cierra cada pedido en despacho como entregado o como perdido.

## Listos para despacho

Pedidos con `status = 'pagado'` y `fulfillment_status = 'preparado'`. Un filtro
de tres posiciones decide cuáles se muestran:

| Filtro | Muestra |
|---|---|
| **Hoy** (por defecto) | `desired_delivery_date` igual a hoy en `America/Bogota`, más atrasados y sin fecha |
| **Próximos** | `desired_delivery_date` posterior a hoy |
| **Todos** | Todos los listos |

- El filtro viaja en la URL: `?listos=hoy|proximos|todos`. Un valor inválido o
  ausente equivale a `hoy`.
- Cada posición del filtro muestra su conteo.
- Atrasados y sin fecha entran en "Hoy" para que ningún pedido pendiente quede
  oculto en la vista por defecto.
- Orden: fecha de entrega más próxima primero, sin fecha al final
  (`sortByDesiredDate`, como hoy).

No hay selector de fecha exacta: "Próximos" ordenado por fecha cubre el caso.

### Domicilio y tienda

Dentro de "Listos para despacho" los pedidos se separan en dos grupos, cada
uno con su conteo:

- **Para domicilio:** todo lo que no se recoge en tienda, incluidos los
  pedidos sin `delivery_method`. Es el grupo que pasa a "En despacho".
- **Recogen en tienda:** `delivery_method = 'tienda'`. Pasan de listo a
  entregado sin entrar a despacho.

La regla es la misma que usa `nextStep`. El filtro Hoy / Próximos / Todos
aplica a los dos grupos y sus conteos son el total de ambos.

## En despacho

Pedidos con `fulfillment_status = 'en_despacho'`. Siempre todos, sin filtro de
fecha.

## Tarjeta

| Dato | Origen |
|---|---|
| Orden | `orders.human_number` |
| Tipo de envío | `orders.delivery_method` |
| Marca de fecha | `Hoy`, `Atrasado · N días`, `Sin fecha` o la fecha, según `desired_delivery_date` |
| Productos | una línea por producto: nombre, SKU y cantidad. Sin precios |
| Tarjeta | De y Para, solo si el cliente pidió tarjeta |
| Observación especial | solo si existe |
| Recibe, teléfono, dirección | `sale_details`, como hoy |

Los campos de `sale_details` solo se muestran si el formulario posventa fue
enviado (`submitted_at` no nulo), como hoy.

## Acciones

- **Listos:** el botón actual. "Enviar a despacho", o "Marcar entregado" cuando
  el pedido se recoge en tienda.
- **En despacho:** "Entregado" (principal) y "Perdido" (secundario).

### Perdido

"Perdido" abre un diálogo modal (`<dialog>` nativo) que pide confirmar y
escribir el motivo. El motivo es obligatorio: entre 1 y 500 caracteres después
de recortar espacios.

- Solo se puede marcar perdido un pedido pagado que está `en_despacho`. Un
  pedido que se recoge en tienda nunca entra a despacho, así que no tiene esta
  opción.
- La acción de servidor escribe `fulfillment_status = 'perdido'` y
  `lost_reason` solo si la fase sigue siendo `en_despacho` (misma protección
  contra doble clic que `advanceFulfillment`). Si el pedido cambió entre tanto,
  el diálogo lo informa y no escribe nada.
- El motivo se muestra en el detalle del pedido (`/admin/pedidos/[id]`) cuando
  el estado es perdido.
- Perdido no toca `payment_status` ni el inventario: el pedido sigue pagado y
  el stock no se devuelve. Reposición o reembolso se gestionan aparte.

## Datos

Migración `add_lost_reason_to_orders`
(`docs/plans/2026-10-13-add-lost-reason.sql`): columna `orders.lost_reason`,
texto, nula por defecto.

No lleva restricción que la exija cuando la fase es `perdido`: el asistente de
WhatsApp también puede escribir esa fase y no envía motivo. La obligatoriedad
vive en la acción del panel.

## Pruebas

Funciones puras con `node --test`: lectura de `?listos`, clasificación de un
pedido por fecha (hoy, atrasado con sus días, próximo, sin fecha), filtrado de
los listos, validación del motivo, regla de quién puede marcarse perdido y
armado de la tarjeta.
