# 0004 — Correlativo humano de pedido configurable en tabla, no hardcodeado

**Fecha:** 2026-09-11, revisada 2026-09-12 · **Estado:** Aceptada (revisada) · **Spec relacionada:** `specs/003_rediseno_panel_kpis_tabla_operativa`

## Contexto

El Excel del negocio numera pedidos como `C0758`, `FE2329` — una letra que cambia por año más
un secuencial. `orders.id` es un UUID, sin ningún correlativo humano. `spec.md` de 003 §5.1
decidió agregar `orders.human_number` para esto.

## Decisión — primera versión (2026-09-11)

`orders.human_number text default ('C' || lpad(nextval(seq)::text, 4, '0'))` — una secuencia
de Postgres plana, con la letra `'C'` escrita como literal directo en el `DEFAULT` de la
columna.

## Por qué se revisó (2026-09-12)

El usuario señaló, tras ver esta primera versión, dos cosas que la hacían insuficiente:

1. La letra cambia con el tiempo (el negocio usa una letra distinta por año) y **quiere
   poder cambiarla él mismo** — sin pedir otra migración cada vez que llegue un año nuevo.
2. Este ambiente es de pruebas: la numeración debe arrancar en `TEST0001`, no intentar
   continuar la numeración real del Excel histórico (`C0758`+).

Un literal SQL dentro de un `DEFAULT` no es configurable sin una migración — exactamente lo
que el usuario pidió evitar.

## Decisión final

Una tabla de una sola fila, `order_number_settings(id=1, prefix, next_number)`, más una
función `generate_order_human_number()` que bloquea esa fila, incrementa `next_number` y
devuelve `prefix || lpad(next_number, 4, '0')`. `orders.human_number` usa esa función como
`DEFAULT`. Sembrada con `prefix='TEST'`.

Cambiar la letra el año que viene es un `UPDATE`, no una migración:

```sql
update order_number_settings set prefix = 'D', next_number = 0 where id = 1;
```

**Propiedad emergente verificada, no solo asumida:** al ser un `UPDATE` sobre una tabla
normal (no un `nextval()` de secuencia, que nunca revierte), el contador es transaccional —
se probó insertando un pedido de prueba dentro de una transacción con `ROLLBACK` y
confirmando que `next_number` volvió a su valor anterior. Un pedido que nunca se confirma no
deja huecos en la numeración.

## Alternativas consideradas

**Secuencia de Postgres con la letra en una variable de aplicación (no en SQL).** Movería la
configurabilidad a TypeScript en vez de SQL, pero entonces cualquier inserción de `orders`
que no pase por el código del panel (la RPC `reserve_variant` del agente, que es la que
realmente crea pedidos hoy) no tendría forma de generar el número — habría que tocar esa RPC
compartida con el agente, algo que este proyecto evita explícitamente sin necesidad real.

## Consecuencias

- `generate_order_human_number()` es la única escritora de `order_number_settings`. Nadie
  más debería hacer `UPDATE` sobre `next_number` salvo para cambiar de letra a propósito.
- El panel no tiene todavía una pantalla para cambiar `prefix` — es un `UPDATE` manual en
  Supabase hasta que se pida esa UI (el diseño ya lo deja listo sin retrabajo).
- Los 3 pedidos reales que existían antes de esta migración recibieron `TEST0001`–`TEST0003`
  retroactivos; ese número no corresponde a nada del Excel histórico real.
