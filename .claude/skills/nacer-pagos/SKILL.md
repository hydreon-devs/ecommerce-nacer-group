---
name: nacer-pagos
description: Integración de Mercado Pago para Nacer Group — Checkout Pro con API de preferencias, validación de firma x-signature del webhook, idempotencia por external_reference, comportamiento asíncrono según método de pago (tarjeta, PSE, efectivo), tarifas de Colombia y pruebas en sandbox. Cargar antes de escribir cualquier código que cree preferencias, reciba webhooks, concilie pagos, calcule comisiones o marque un pedido como pagado.
---

# Pagos — Mercado Pago Colombia

## 1. Modalidad

**Checkout Pro** mediante la **API de preferencias**. El flujo es el mismo para web y
WhatsApp, y es lo que permite que ambos canales compartan la infraestructura de cobro:

```
1. Se crea el pedido en estado_pago = 'pendiente'
2. Se crea la preferencia en Mercado Pago con external_reference = pedido.id
3. Mercado Pago devuelve init_point (URL de pago)
4. El init_point se abre en el checkout web o se envía por WhatsApp
5. El cliente paga
6. Mercado Pago notifica al webhook en n8n
7. Se verifica contra la API y se actualiza estado_pago
```

`external_reference` **siempre** lleva el ID del pedido. Es la llave de idempotencia y sin
ella no hay forma de conciliar.

## 2. Los cuatro mandamientos del webhook

Esta es el área de mayor riesgo del proyecto: si falla, se cobran ventas que no se registran
o se registran pedidos duplicados.

1. **Mercado Pago notifica a un webhook en n8n.**
2. **Validar la firma `x-signature`.** Un webhook sin firma válida se rechaza con 401. No se
   procesa "por si acaso".
3. **Nunca confiar en el cuerpo del webhook ni en la página de retorno.** El cuerpo dice que
   hay una novedad; no dice la verdad sobre el estado. Consultar
   `GET /v1/payments/{id}` contra la API de Mercado Pago y usar **esa** respuesta para
   decidir. La página de retorno (`back_urls`) es solo experiencia de usuario: el cliente
   puede cerrarla, recargarla o falsificarla.
4. **Idempotencia obligatoria.** Mercado Pago reintenta las notificaciones. Antes de
   procesar, verificar si ese `mp_payment_id` ya fue procesado. Procesar dos veces el mismo
   pago debe ser un no-op, no un pedido duplicado ni un stock descontado dos veces.

Guardar siempre la respuesta completa en `pagos.payload_crudo` para auditoría y depuración.

Responder 200 rápido y procesar en cola (Redis). Un webhook que tarda es un webhook que
Mercado Pago reintenta.

## 3. Métodos de pago y su comportamiento

Habilitar todos los de Mercado Pago Colombia. **El tiempo hasta la confirmación cambia la
arquitectura**, no solo la experiencia:

| Método | Comportamiento | Confirmación | `estado_pago` intermedio |
|---|---|---|---|
| Tarjeta crédito/débito | Síncrono | Segundos | — |
| PSE | Redirección al banco, asíncrono | Minutos | `en_proceso` |
| Efectivo (Efecty, Baloto) | Genera cupón, se paga en punto físico | **Horas o días** | `en_proceso` |

Nunca asumir que el pago se resuelve en la misma sesión. El pedido tiene que poder vivir
en `en_proceso` durante días sin romperse.

## 4. TODO(decisión) — reserva de stock vs. pago en efectivo

**Conflicto abierto y sin resolver.** La política de reserva de 30–60 minutos es incompatible
con el pago en efectivo, que puede tardar días.

Opciones sobre la mesa:
- (a) No reservar stock en pagos en efectivo.
- (b) Reservar por el plazo de vencimiento del cupón.
- (c) Deshabilitar efectivo en referencias de stock limitado.

**Hasta que se decida**, no implementar una política de reserva que asuma pago inmediato para
todos los métodos. Dejar el punto de decisión explícito en el código.

Recordar que los ítems `Bajo pedido` no consumen stock y por lo tanto no participan de este
conflicto (ver `nacer-dominio`).

## 5. Tarifas vigentes (Colombia)

| Acreditación | Comisión |
|---|---|
| Inmediata | 3,29% + $800 + IVA |
| 7 días | 2,99% + $800 + IVA |
| 14 días | 2,79% + $800 + IVA |

El componente fijo de $800 pesa fuerte en el ticket bajo: sobre una tarjeta artesanal de
$35.000 equivale a 2,3 puntos adicionales. Si se calculan márgenes en los tableros, la
comisión no es solo el porcentaje.

## 6. Pruebas

Usar el **sandbox de Mercado Pago** con las tarjetas de prueba oficiales. Cobertura mínima:

- Tarjeta aprobada.
- Tarjeta rechazada.
- PSE.
- **Reintento de webhook** → verificar que no se duplica el pedido ni el descuento de stock.
- **Webhook con firma inválida** → verificar que se rechaza.

Tras cada despliegue, prueba de humo en producción: un pedido real de bajo valor, pagado y
verificado extremo a extremo.

## 7. Pendientes del cliente

- ⬜ **Bloqueante** — Titularidad de la cuenta de Mercado Pago a nombre de Nacer Group. Sin
  esto no se puede integrar el cobro.
- ⬜ Plazo de acreditación configurado (define la comisión de la tabla anterior).
- ⬜ Otros medios fuera de Mercado Pago (Nequi, transferencia, contra entrega) y su proporción.
- ⬜ Pagos parciales, anticipos y abonos para pedidos por encargo.
- ⬜ Política de devoluciones y reembolsos (`reembolsado` y `reembolsado_parcial` ya existen
  en el enum, pero el procedimiento de negocio no está definido).
