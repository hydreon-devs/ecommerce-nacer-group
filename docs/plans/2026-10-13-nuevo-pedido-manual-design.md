# Nuevo pedido manual desde el panel

Aprobado el 2026-10-13.

## Propósito

Un asesor registra en el panel una venta que ya cobró por fuera del asistente de
WhatsApp y de la tienda. El pedido nace **Pagado** y **En construcción**, con el
asesor como vendedor, y entra al mismo flujo de Producción y Despachos que los
demás.

## Decisiones

| Tema | Decisión |
|---|---|
| Entrada | El botón "Nuevo pedido" reemplaza a "Ver estadísticas" en `/admin/pedidos` y abre `/admin/pedidos/nuevo` (página propia, como "Nuevo producto"). |
| Escritura | Una función nueva en la base, `create_panel_sale(p_payload jsonb)`, hace todo en una transacción. O se registra todo o no queda nada. |
| Domicilio | El asesor elige la zona que cobró: Zona 1 a Zona 4, cada una con su valor. La zona N es el N-ésimo tramo de `delivery_tariffs` ordenado por `km_from`. |
| Medio de pago | `transferencia` o `mercadopago`. La transferencia queda aprobada de una vez: el asesor ya la verificó. |
| Precio | Precio de catálogo (`base_price + price_delta` más adicionales). Sin descuentos. |
| Stock | No se vende más de lo disponible (`stock_qty - reserved_qty`). |
| Mensajes | No se envía WhatsApp al cliente ni correo al operador. |
| Identidad | El pedido usa `chat_id = 'panel:<uuid>'`, así nunca se mezcla con el carrito de WhatsApp del cliente. |
| Roles | Fuera de alcance: por ahora todo se hace como admin. |

## Formulario

1. **Productos**: buscador, variante, cantidad y adicional cuando el producto lo
   tenga. Muestra stock disponible y precio de catálogo.
2. **Entrega**: recoger en tienda o domicilio. Con domicilio: zona y dirección.
   Fecha de entrega y ocasión, opcionales.
3. **Pago**: transferencia o Mercado Pago, referencia opcional. El total
   (productos más domicilio) se calcula solo.
4. **Comprador y destinatario**: nombre y celular del comprador obligatorios.
5. **Tarjeta, factura y cómo nos conoció**: los campos de `sale_details`, todos
   opcionales.

## Contrato de `create_panel_sale`

SQL completo en `2026-10-13-create-panel-sale.sql`. Solo `service_role` puede
ejecutarla.

### Entrada

```json
{
  "advisor_name": "Nombre del asesor",
  "payment_source": "transferencia",
  "payment_ref": "opcional",
  "delivery_method": "domicilio",
  "delivery_zone": 2,
  "delivery_address": "Calle 10 # 20-30",
  "desired_delivery_date": "2026-10-20",
  "occasion": "cumpleaños",
  "lines": [
    { "variant_sku": "SKU-DE-VARIANTE", "qty": 1, "option_name": "Crisálida adicional", "option_qty": 1 }
  ],
  "details": {
    "buyer_name": "", "buyer_phone": "", "buyer_email": "",
    "recipient_name": "", "recipient_phone": "", "may_call_recipient": "si",
    "delivery_address_exact": "", "delivery_unit": "", "building_name": "",
    "neighborhood": "", "city": "",
    "card_from": "", "card_to": "", "card_message": "", "special_notes": "",
    "wants_invoice": "no", "invoice_legal_name": "", "invoice_tax_id": "", "invoice_email": "",
    "referral_source": "Instagram"
  }
}
```

- `delivery_zone` y `delivery_address` solo aplican con `domicilio`.
- `payment_ref`, `desired_delivery_date`, `occasion`, `option_name` y todo
  `details` salvo `buyer_name` y `buyer_phone` son opcionales.
- `may_call_recipient` y `wants_invoice` viajan como texto `"si"` / `"no"`.
- `occasion` debe ser uno de los valores de `orders_occasion_check`.
- `referral_source`: `Instagram`, `Facebook`, `Un conocido`, `Google`, `Otro`.

### Salida

Éxito: `{ "ok": true, "order_id": "<uuid>", "numero_pedido": "C0057", "total": 246500 }`.

Error: `{ "ok": false, "error": "<CODIGO>", "paso": "productos|entrega|pago|datos", ... }`.
No queda nada escrito. El campo `mensaje` que traen algunos errores está
redactado para el modelo del asistente: el panel muestra su propio texto según
el código.

| Paso | Códigos |
|---|---|
| productos | `PEDIDO_SIN_LINEAS`, `LINEA_INVALIDA`, `VARIANTE_NO_DISPONIBLE`, `SKU_ES_PRODUCTO`, `STOCK_INSUFICIENTE` (trae `unidades`), `OPCION_NO_EXISTE`, `OPCION_EXCEDE_MAXIMO` (trae `maximo`). Todos traen `variant_sku` salvo los dos primeros. |
| entrega | `METODO_INVALIDO`, `DIRECCION_REQUERIDA`, `ZONA_INVALIDA`, `FECHA_INVALIDA` |
| pago | `ORIGEN_INVALIDO`, `PAGO_YA_APLICADO` (esa referencia ya confirmó otro pedido), `LINEAS_INVALIDAS` |
| datos | `VENDEDOR_REQUERIDO`, `DATOS_INVALIDOS` (trae `campos` con los nombres de campo inválidos, o `restriccion`) |

## Límites conocidos

- La fecha de entrega no se valida contra domingos y festivos: el asesor puede
  estar registrando una venta ya pactada.
- La distancia guardada para un domicilio del panel es la mínima de la zona, no
  la real. El panel muestra la zona, no los kilómetros.
- El camino feliz crea un pedido real, así que no se probó contra la base de
  producción; solo se probaron los caminos que no escriben o que se deshacen.
