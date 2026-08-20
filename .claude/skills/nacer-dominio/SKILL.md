---
name: nacer-dominio
description: Reglas de negocio invariantes de Nacer Group — disponibilidad vs stock, máquina de tres estados (pago, pedido, facturación), reservas de inventario, modalidades de entrega, marcas que venden vs marcas de enlace externo, y el esquema de datos. Cargar antes de escribir migraciones, modelos, lógica de carrito, transiciones de pedido, cálculo de totales, consultas de catálogo o cualquier código que lea o escriba productos, pedidos, pagos o stock.
---

# Dominio de Nacer Group

## 1. Marcas

| Marca | Prefijo SKU | Categorías | Vende en el sitio |
|---|---|---|---|
| Crisálidas y Mariposas | `CM` | Experiencia · Artesanía · Detalle | Sí |
| Jagua | `JA` | Artesanía · Papelería · Regalo empresarial | Sí |
| Florea | `FL` | Colmena · Taller · Kit educativo | **No — enlace externo** |

Florea se modela en la tabla `marcas` con `vende_en_sitio = false` y `url_externa`
poblada. No se cargan sus productos. La sección de Florea en el sitio es informativa
y termina en un enlace saliente.

Toda consulta de catálogo — web y agente — filtra por:

```sql
WHERE p.activo = true
  AND m.vende_en_sitio = true
```

Si en el futuro Florea vende, se cambia el booleano y se cargan los productos. Ningún
esquema ni código debe asumir que solo existen dos marcas.

Las categorías de Florea — `Colmena`, `Taller`, `Kit educativo` — **se conservan declaradas
en el enum** aunque hoy no tengan productos. Activarla será carga de datos, no migración.

## 2. Disponibilidad ≠ stock

**La regla más importante del proyecto.** Rompe el patrón estándar de ecommerce.

```
disponibilidad = 'Disponible'   → stock > 0   → venta inmediata, descuenta stock
disponibilidad = 'Bajo pedido'  → stock = 0   → SÍ SE VENDE, se produce en tiempo_preparacion_dias
disponibilidad = 'Agotado'      → stock = 0   → NO se vende
```

Un motor de inventario convencional trataría `stock = 0` como no vendible y bloquearía
las ventas de mayor valor del catálogo. La función de vendibilidad es:

```ts
function esVendible(p: Producto): boolean {
  if (!p.activo) return false;
  if (p.disponibilidad === 'Agotado') return false;
  if (p.disponibilidad === 'Bajo pedido') return true;   // stock irrelevante
  return p.stock > 0;                                     // 'Disponible'
}
```

Nunca escribir `if (producto.stock > 0)` como condición de compra. Siempre pasar por
`esVendible`.

## 3. Máquina de estados — tres dimensiones independientes

Un pedido puede estar pagado y sin producir, o producido y sin facturar. Un solo campo
no alcanza.

### `estado_pago`
`pendiente` · `en_proceso` · `pagado` · `fallido` · `expirado` · `reembolsado` · `reembolsado_parcial`

- `pendiente` → enlace generado, sin pagar
- `en_proceso` → PSE o efectivo iniciado, sin acreditar
- `pagado` → **verificado contra la API de Mercado Pago**, nunca por el webhook solo

### `estado_pedido`
`borrador` · `confirmado` · `en_preparacion` · `agendado` · `listo` · `despachado` · `entregado` · `realizado` · `cancelado` · `devuelto`

Dos caminos según el tipo de ítem:

```
Producto físico:   confirmado → en_preparacion → listo → despachado → entregado
Experiencia:       confirmado → agendado → realizado
Cualquiera:        → cancelado    (antes de completarse)
Producto físico:   entregado → devuelto
```

`en_preparacion` aplica a lo que tiene `tiempo_preparacion_dias > 0` o está `Bajo pedido`.
`agendado`/`realizado` aplican cuando `requiere_agenda = true`.

Las transiciones válidas se declaran en una tabla y se validan en código. Una transición
no declarada es un error, no un `console.warn`.

### `estado_facturacion`
`no_requiere` · `pendiente` · `emitida` · `fallida`

Se implementa desde el MVP aunque la emisión sea manual. Evita migrar datos cuando entre
la fase 2 con Aliaddo.

## 4. Reservas de stock

`reservas_stock` con `expira_en` implementa el bloqueo temporal. Requiere un job que
libere las vencidas.

- Solo se reserva cuando `disponibilidad = 'Disponible'`. Un ítem `Bajo pedido` no
  consume stock, por lo tanto no se reserva.
- El stock efectivo disponible es `stock - SUM(reservas activas no vencidas)`.
- **Conflicto abierto**: el pago en efectivo puede tardar días y la ventana de reserva
  es de 30–60 minutos. Decisión pendiente (ver `nacer-pagos`). Hasta que se decida, no
  implementar una política de reserva que asuma pago inmediato para todos los métodos.

## 5. Modalidades de entrega

| Modalidad | Aplica a | Requiere |
|---|---|---|
| `Medellín y área metropolitana` | Producto físico | Dirección + cálculo de domicilio por zona |
| `Entrega coordinada` | Regalo empresarial (Jagua) | Contacto posterior, sin tarifa automática |
| `Fecha coordinada` | Experiencia (Crisálidas) | **Agenda**, no dirección |

`requiere_agenda = true` saca al pedido del flujo de despacho y lo mete en el flujo de
agenda. El checkout debe pedir fecha, no dirección.

Un pedido puede mezclar ítems de modalidades distintas. El checkout tiene que resolver
eso: si hay al menos un ítem físico pide dirección, y si hay al menos un ítem agendable
pide fecha.

## 6. Ocasiones

Es la **dimensión principal de recuperación**, más importante que la categoría. Relación
N:N vía `producto_ocasion`.

`celebración` · `homenaje` · `regalo` · `familia` · `acompañar` · `recordar` ·
`condolencias` · `conservación` · `educación` · `naturaleza` · `experiencia` ·
`decoración` · `agradecer` · `celebrar` · `empresas`

`condolencias` y `acompañar` no son decorativas: hay producto diseñado para duelo. El
tono de la interfaz y del agente debe sostener ese registro.

## 7. Esquema

```
marcas            id · nombre · slug · logo · color_primario · url_externa ·
                  vende_en_sitio · activo
productos         id · sku · nombre · nombre_busqueda · alias_busqueda · marca_id ·
                  categoria · descripcion_corta · descripcion_larga · precio_cop ·
                  disponibilidad · stock · tiempo_preparacion_dias · modalidad_entrega ·
                  es_pieza_unica · requiere_agenda · activo
producto_ocasion  producto_id · ocasion_id
ocasiones         id · nombre · slug
imagenes          id · producto_id · url · orden · alt
clientes          id · telefono · nombre · email · documento_tipo · documento_numero ·
                  direccion · ciudad · requiere_factura · origen · creado_en
pedidos           id · numero · cliente_id · canal · estado_pago · estado_pedido ·
                  estado_facturacion · subtotal · valor_envio · total ·
                  fecha_agendada · fecha_comprometida · creado_en
pedido_items      id · pedido_id · producto_id · cantidad · precio_unitario · subtotal
pagos             id · pedido_id · mp_payment_id · mp_preference_id · external_reference ·
                  metodo · monto · estado · procesado_en · payload_crudo
reservas_stock    id · producto_id · pedido_id · cantidad · expira_en · liberada
conversaciones    id · cliente_id · canal · estado · escalada_a_humano · creado_en
mensajes          id · conversacion_id · rol · contenido · creado_en
zonas_envio       id · nombre · ciudad · valor · tiempo_estimado
```

Notas:
- `canal` en `pedidos` distingue `whatsapp` de `web`. Comparten el mismo flujo desde la
  generación del cobro.
- `precio_unitario` se **congela** en `pedido_items` al confirmar. Nunca se lee el precio
  vivo del producto para un pedido histórico.
- `payload_crudo` en `pagos` guarda la respuesta completa de Mercado Pago para auditoría.
- `nombre_busqueda` es el nombre normalizado sin tildes; `alias_busqueda` son sinónimos
  separados por coma.

## 8. Roles y acceso

| Rol | Ve | No ve |
|---|---|---|
| `admin` | Todo | — |
| `ventas` | Ventas, pedidos, clientes, márgenes | — |
| `inventario` | Inventario y stock | Datos financieros de cliente |
| `produccion` | Cola de producción y agenda | **Márgenes y datos de contacto del cliente** |

Se aplica con **Row Level Security en Supabase**. Ocultar columnas en el frontend no es
control de acceso.

## Decisiones abiertas

Marcar con `TODO(decisión)` en el código, no resolver por cuenta propia:

- Política de reserva para pagos en efectivo.
- **Si `Experiencia` (Crisálidas) usa `Fecha coordinada`.** El documento maestro solo asignó
  esa modalidad a `Taller`, que era de Florea. Mientras no se resuelva, `requiere_agenda` se
  define **por producto** para no cerrar ninguna de las dos opciones, y el checkout soporta
  el camino agendado desde el día uno.
- Umbral en COP para escalar "cliente de alto valor" a humano.
- Si los precios incluyen IVA.
- Existencia de variantes (talla, color, tamaño) y de piezas únicas con tirada de 1.
