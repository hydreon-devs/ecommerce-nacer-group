# Bloque de confianza del Home

## Objetivo

Reemplazar la banda de cifras ficticias del cierre del Home por una sección
editorial que ayude a tomar una decisión de compra usando información
verificable del proyecto.

## Concepto aprobado

La sección se titula **“Lo importante antes de elegir”** y funciona como puente
entre el final del recorrido narrativo y el CTA “El catálogo completo te
espera”. Su tono es honesto, natural y directo.

Presenta tres principios:

1. **El momento primero:** el catálogo se explora por ocasión, no solo por
   categoría.
2. **Disponibilidad sin promesas falsas:** distingue producto disponible, bajo
   pedido y agotado, e informa el tiempo de preparación.
3. **Coordinación humana:** las experiencias y fechas especiales se coordinan
   por WhatsApp.

## Dirección visual

- Banda oscura de ancho completo, con texto crema y acentos ámbar.
- Composición editorial asimétrica: manifiesto a la izquierda y principios
  numerados a la derecha.
- Separadores finos y numerales grandes en lugar de tarjetas genéricas.
- Revelado progresivo aplicado al contenido interior; el fondo nunca depende
  de una animación para ser visible.
- Una columna en móvil y dos columnas en escritorio.
- Sin cifras, testimonios ni afirmaciones no verificadas.

## Implementación y validación

El bloque será un Server Component con contenido tipado en `lib/content/home.ts`.
Se retirarán `HOME_STATS`, `StatsOverlay` y el contador animado, siempre que no
tengan otros consumidores. Se validará con lint, build y revisión visual en
escritorio y móvil, incluyendo `prefers-reduced-motion` mediante la envoltura de
movimiento existente.
