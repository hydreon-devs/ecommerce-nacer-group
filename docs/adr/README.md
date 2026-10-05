# Registro de Decisiones de Arquitectura (ADR)

Decisiones estructurales del panel de administración que no caben cómodamente en un solo
`spec.md` porque cruzan varias specs, o que se revisaron en vivo por feedback directo del
usuario y vale la pena que quede claro el "por qué", no solo el "qué".

No se documenta aquí cualquier decisión — solo las que serían costosas de deshacer o que un
lector futuro (humano o agente) necesitaría entender antes de tocar esa parte del sistema.
Decisiones de alcance de producto (qué construir) siguen viviendo en `specs/`; estas son de
**cómo** se construyó una vez decidido el qué.

| # | Título | Estado |
|---|---|---|
| [0001](0001-proxy-ts-no-middleware-ts.md) | `proxy.ts` en vez de `middleware.ts` | Aceptada |
| [0002](0002-dos-clientes-supabase-panel.md) | Dos clientes de Supabase separados en el panel | Aceptada |
| [0003](0003-fulfillment-status-columna-no-tabla.md) | `fulfillment_status` como columna, no tabla de historial | Aceptada |
| [0004](0004-correlativo-humano-configurable.md) | Correlativo de pedido configurable en tabla, no hardcodeado | Aceptada (revisada) |
| [0005](0005-asesor-proveedor-texto-libre.md) | Asesor y proveedor como texto libre, con default "Agente virtual" | Aceptada |
| [0006](0006-paleta-panel-separada-de-tienda.md) | Paleta del panel separada de la tienda, con un solo acento compartido | Aceptada (revisada) |
