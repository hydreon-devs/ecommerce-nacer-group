# 0005 — Asesor y proveedor como texto libre, con default "Agente virtual"

**Fecha:** 2026-09-12 · **Estado:** Aceptada · **Spec relacionada:** `specs/003_rediseno_panel_kpis_tabla_operativa`

## Contexto

El Excel rastrea `ASESOR` (persona de Nacer Group que gestionó el pedido, ej. "Dayana",
"Sara") y `PROVEEDOR` (taller externo que produce el arreglo, ej. "MANUEL(MONARCA)"). Ninguno
existía en Supabase.

## Decisión

Dos columnas de texto libre en `orders` — `advisor_name`, `supplier_name` — sin tabla
`asesores`/`proveedores` con FK. El usuario fue explícito: la artesana registra el proveedor
a mano hoy, y el llenado real de ambos campos eventualmente vivirá en un futuro "dashboard de
la artesana" (el tablero de producción que ya estaba fuera de alcance del MVP, spec 002 §4) —
no vale la pena la integridad referencial de una tabla catalogada todavía.

**Revisión sobre la marcha:** el usuario notó que cuando el agente de WhatsApp cierra la
venta sin que ninguna persona intervenga —el caso normal hoy, ya que no existe ningún flujo
de venta asistida por humano en producción— el campo no debería quedar vacío pidiendo que
alguien lo llene a mano; debería decir explícitamente "Agente virtual". Se implementó como
`alter table orders alter column advisor_name set default 'Agente virtual'` más un backfill
de las filas existentes. `supplier_name` no recibió default: no hay equivalente "automático"
para quién produce físicamente un arreglo — ese dato es genuinamente desconocido hasta que
una persona lo registra.

## Alternativas consideradas

**Tablas `asesores`/`proveedores` con FK desde ahora.** Descartada explícitamente por el
usuario: sin lista cerrada de asesores/proveedores todavía, y sin el volumen de pedidos que
justifique la integridad referencial hoy.

**Fallback "Agente virtual" solo en la UI (sin tocar la base).** Habría sido más barato,
pero pierde el significado en cualquier consulta directa a `orders` (reportes, exportes
futuros) — quien lea la tabla sin pasar por el panel vería `NULL` donde en realidad se sabe
con certeza que fue el agente quien cerró la venta.

## Consecuencias

- Un pedido creado por cualquier vía (agente de WhatsApp o, en el futuro, `payment_source =
  'panel'`) nace con `advisor_name = 'Agente virtual'` — el panel lo sobreescribe cuando una
  persona interviene manualmente.
- Si el volumen de proveedores/asesores crece y aparecen typos duplicando el mismo nombre de
  formas distintas, la migración natural es la Opción descartada arriba — aditiva, no
  destructiva.
