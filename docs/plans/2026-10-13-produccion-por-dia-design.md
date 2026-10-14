# Producción por día de entrega — diseño

**Fecha:** 2026-10-13 · **Estado:** Aprobado · **Ruta:** `/admin/produccion`

## Objetivo

La artesana abre el panel y ve los pedidos que se entregan hoy. Con un selector
de fecha escoge cualquier otro día para anticiparse. Reemplaza la hoja de Excel
que usa hoy el equipo y las tarjetas actuales del panel.

## Qué carga

- Pedidos con `status = 'pagado'` y `desired_delivery_date` igual al día
  seleccionado. Sin fecha en la URL, el día es hoy en `America/Bogota`.
- Vista estricta por día: no hay bloque de atrasados ni pedidos sin fecha.
- El día viaja en la URL: `?fecha=YYYY-MM-DD`. Un valor inválido equivale a hoy.
- Dos secciones con contador, como en Despachos: "En construcción" y "Listos"
  (todo lo que ya salió de producción: preparado, en despacho, entregado o
  perdido). Cada una con su mensaje cuando está vacía.

## Selector de fecha

Calendario (`input type="date"`) que admite cualquier día, más tres atajos:
día anterior, día siguiente y "Hoy".

## Encabezado

Fecha seleccionada en texto largo, número de pedidos y total de crisálidas del día.

## Tarjetas

La primera versión fue una tabla de diez columnas; al verla, el usuario pidió
tarjetas. Cada tarjeta muestra solo:

| Dato | Origen |
|---|---|
| Orden | `orders.human_number` |
| Tipo de envío | `orders.delivery_method` |
| Número de productos | suma de `reservations.qty` ("1 producto", "3 productos") |
| Asesor | `orders.advisor_name` |
| Ciudad y barrio | `sale_details.city`, `sale_details.neighborhood` |
| Estado | estado derivado (`deriveOrderState`) |
| Acciones | "Ver detalles" |

Todo lo demás vive en "Ver detalles".

## Ver detalles

Diálogo modal centrado (`<dialog>` nativo) que no cambia de página ni de día.
Encabezado con orden, estado y botón de cerrar; el cuerpo se desplaza dentro.
Si el pedido está en construcción, el pie fijo del diálogo trae "Marcar
preparado": la artesana marca el pedido después de ver qué lleva.
Secciones, en este orden:

- **Entrega**: fecha de entrega (`orders.desired_delivery_date`), ocasión
  (`orders.occasion`), tipo de envío y ciudad y barrio (`sale_details.city`,
  `sale_details.neighborhood`). Siempre las cuatro, con raya si falta alguna.
- **Productos**: un producto por fila con foto (`product_variants.image_url`,
  cuadro fijo; si falta o falla, queda el fondo vacío), nombre, cantidad y
  crisálidas. Bajo el nombre, en texto pequeño, la variante
  (`product_variants.attributes`) y los adicionales. Sin descripción del
  producto. Termina con una fila de totales (cantidad y crisálidas).
- **Tarjeta**: De, Para y mensaje.
- **Observación especial** completa.
- **Equipo**: asesor (solo lectura) y dos campos de texto libre editables, que
  guardan al salir del campo: **Proveedor** (`orders.supplier_name`, quien surte
  las mariposas) y **Artesano** (`orders.artisan_name`, quien arma el pedido).
  Son personas distintas; la artesana escribe ambos. Lado a lado en pantallas
  anchas, apilados en angostas. Esta vista escribe solo esos dos campos.

Si el cliente no ha enviado el formulario posventa (`submitted_at` nulo), los
campos de `sale_details` no se muestran y el diálogo lo indica.

## Crisálidas

`product_variants.chrysalis_count` guarda las crisálidas de una unidad
(migración `add_chrysalis_count_to_product_variants`, ya aplicada).

```
crisálidas de la línea = qty × (chrysalis_count + adicionales de crisálida por unidad)
```

Un adicional cuenta como crisálida cuando su nombre, sin tildes ni mayúsculas,
contiene "crisalida". Los adicionales están en `reservations.options` como
`[{ "nombre", "qty", "precio" }]` y van por unidad de la línea.

`chrysalis_count` nulo es "sin definir": la línea muestra un guion y no suma
al total.

## Datos que no se muestran

Teléfono, dirección exacta, correo y datos del comprador. El panel aún no
tiene roles, así que la consulta de producción pide solo las columnas que usa
en vez de `sale_details.*`.

## Pruebas

Funciones puras con `node --test`: lectura de `?fecha`, día de hoy en Bogotá,
día anterior y siguiente, cálculo de crisálidas y armado de la vista.
