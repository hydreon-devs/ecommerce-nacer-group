# Panel de carritos por vigencia — diseño

Aprobado el 2026-10-13.

## Problema

El panel `/admin/carritos` no deja ver qué pedidos sin pagar siguen vigentes:

- Está fijo en el mes en curso por `created_at`, sin selector. Un pedido cancelado
  en septiembre (C0009) no aparece en octubre, ni en la tarjeta ni en la tabla.
- La tarjeta "Abiertos" cuenta por `orders.status`, pero un pedido puede seguir
  `abierto` con todas sus reservas vencidas. El 2026-10-13 había 5 pedidos
  `abierto` y ninguno vigente.
- Los contadores y la tabla salen de consultas distintas, así que pueden no
  coincidir.

El barrido `expire_reservations()` depende de un flujo de n8n
(`[Inventario] Liberar reservas vencidas`, cada 8 horas) que no está corriendo.
Aunque corra, entre barridos pueden pasar 8 horas: el panel no puede depender
de él.

## Decisiones

1. **Vigencia por reserva, no por 24 horas fijas.** Un pedido está vigente si
   tiene al menos una reserva `activa` con `expires_at` en el futuro. La reserva
   no siempre dura 24 horas: con comprobante de transferencia se extiende hasta
   el cierre del segundo día hábil (spec 033 del asistente).
2. **Tres columnas, cada una con su contador y sus pedidos debajo.**

   | Columna | Contenido | Periodo |
   |---|---|---|
   | Abiertos | `abierto` con reserva vigente | Sin límite |
   | Vencidos | `vencido`, más `abierto` sin reserva vigente | Periodo elegido |
   | Cancelados | `cancelado` | Periodo elegido |

3. **El contador es el largo de la lista.** Una sola clasificación alimenta
   ambos, así que no pueden discrepar.
4. **Campos por pedido, en este orden:** Pedido · Estado · Última actividad ·
   Iniciado. Se quitan productos, valor estimado y chat.
5. **Orden de las filas:** última actividad, la más reciente arriba.
6. **Estado:** rótulo derivado. En Abiertos distingue "Abierto" de "Pendiente
   por aprobar" (comprobante recibido). Un `abierto` sin reserva vigente se
   muestra como "Vencido". Es solo presentación: el panel no escribe estados.
7. **Selector de periodo:** el mismo de Pedidos (`?mes=&anio=`). Aplica a
   Vencidos y Cancelados por `created_at`.

## Accesibilidad

- Cada columna es una sección con encabezado y conteo en texto.
- El estado va en texto, no solo en color.
- Fechas en `<time>` y en hora de Bogotá.
- En móvil las columnas se apilan: Abiertos, Vencidos, Cancelados.
- Sin animaciones nuevas; las existentes respetan `prefers-reduced-motion`.

## Fuera de alcance

- Reactivar el flujo de n8n (se hace en n8n, no en este repositorio).
- Acciones sobre el pedido desde el panel.
- La página de estadísticas, que sigue usando `getFunnelCounts`.

## Pruebas

La clasificación (columna y rótulo de un pedido según su estado, sus reservas y
la hora actual) vive en un módulo puro de `lib/domain` con pruebas unitarias:
abierto vigente, abierto con reserva vencida, abierto sin reservas, abierto con
reserva extendida más allá de 24 horas, vencido, cancelado.
