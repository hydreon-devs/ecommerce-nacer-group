# 0006 — Paleta del panel separada de la tienda, con un solo acento compartido

**Fecha:** 2026-09-11, revisada 2026-09-12 · **Estado:** Aceptada (revisada) · **Spec relacionada:** `specs/003_rediseno_panel_kpis_tabla_operativa`

## Contexto

El usuario pidió un panel "sofisticado", con tema claro/oscuro y estética "high-tech pero
profesional, no exagerada" — explícitamente distinto de la tienda pública, sin tocar los
colores de Crisálidas y Mariposas.

## Decisión — primera versión

Se generó una maqueta interactiva (Artifact) con una paleta slate/navy genérica de dashboard
técnico, sin ninguna relación con la identidad de marca del storefront (`--color-moss`,
`--color-violet`, `--color-amber` de `app/globals.css`).

## Por qué se revisó

El usuario aprobó la dirección general pero pidió explícitamente: *"puedes utilizar la misma
paleta para detalles del admin"* — es decir, el acento del panel debía anclarse a la
identidad real de la marca, no ser genérico, sin por eso convertir el panel en una copia
cálida/botánica de la tienda.

**Se probó, no se asumió, si la paleta completa de marca serviría como color de datos.**
Se corrió el validador de la skill `dataviz` (`scripts/validate_palette.js`) con
`moss`/`violet`/`amber` como paleta categórica de 3 slots contra las superficies elegidas —
**falló los pisos de croma y de separación normal-vision** en ambos modos (moss lee casi
gris, y las variantes "-soft" para oscuro quedan demasiado claras y demasiado parecidas entre
sí). La paleta de marca fue diseñada para calidez decorativa, no para que un lector distinga
series de datos a simple vista — son objetivos distintos, y el resultado del validador lo
confirma con números, no con gusto.

## Decisión final

- **Superficie y cromática de fondo:** slate/navy propios del panel (`app/admin/globals.css`,
  independiente de `app/globals.css` de la tienda). Nunca se tocó ni un color del storefront.
- **Acento único de marca:** `--admin-accent` reutiliza literalmente `--color-moss`
  (`#4b6b4e` claro / `#7c9a7e` oscuro, este último ya definido por la propia marca como su
  variante "-soft") — botones primarios, focus rings, nav activo, tendencia de ventas (única
  serie, sin necesidad de distinguirse de otras).
- **Colores de datos (gráficas categóricas y de estado):** la paleta técnica validada por
  `dataviz`, sin relación con la marca — porque ahí sí importa la separabilidad computable,
  no la identidad visual.
- **Tipografía:** pila de fuentes del sistema, con un monoespaciado reservado a números y
  códigos (montos, `TEST0001`, teléfonos) — dota de carácter "técnico" sin depender de
  Google Fonts ni de una fuente decorativa.

## Alternativas consideradas

**Reordenar/reteñir la paleta categórica de `dataviz` para que sus 8 slots se acercaran más
a los tonos de marca.** La propia documentación de la skill permite sustituir las hues si se
revalida cada candidata — se descartó por alcance: no había pedido explícito de que las
*gráficas* llevaran colores de marca, solo los *detalles* del panel, y forzar esa validación
para 8 slots nuevos no aportaba nada que el acento único no resolviera ya.

## Consecuencias

- Un cambio futuro a la paleta de marca del storefront (`app/globals.css`) **no** se refleja
  automáticamente en el panel — son dos archivos de tokens independientes a propósito. Si se
  decide sincronizarlos, es un cambio explícito en `app/admin/globals.css`, no un efecto
  colateral.
- Cualquier gráfica nueva que se agregue al panel debe decidir conscientemente si es "una
  serie" (usa el acento de marca) o "varias identidades a distinguir" (usa la paleta técnica
  validada) — la regla ya está documentada en `specs/003.../plan.md` §4.3-§4.4.
