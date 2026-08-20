---
name: nacer-motion
description: Animación e interacción de la tienda Nacer Group con Framer Motion — zonas de aplicación con su prioridad, reglas no negociables (prefers-reduced-motion, 150-400 ms, no bloquear LCP ni la interacción) y patrones de implementación en Next.js App Router. Cargar antes de animar cualquier cosa: hero, tarjetas de producto, transiciones de página, carrito, filtros, galería, skeletons o pasos del checkout.
---

# Animación — Framer Motion

Framer Motion está confirmado en el stack. Estas reglas existen porque el catálogo incluye
producto para **condolencias y acompañamiento en duelo**: una animación juguetona en la
ficha equivocada es un error de producto, no de estilo.

## 1. Zonas de aplicación

| Zona | Animación | Prioridad |
|---|---|---|
| Hero de portada | Entrada escalonada de texto e imagen | Alta |
| Tarjetas de producto | Elevación y escala sutil en hover | Alta |
| Carrito | Panel lateral con deslizamiento + confirmación al agregar | Alta |
| Estados de carga | Skeletons con pulso | Alta |
| Transiciones de página | Fundido con desplazamiento corto | Media |
| Filtros de catálogo | Reordenamiento animado de la grilla | Media |
| Galería de producto | Transición entre imágenes | Media |
| Checkout | Avance entre pasos | Media |

Fuera de esta lista, no animar. Si aparece una zona nueva, se agrega aquí primero.

## 2. Reglas no negociables

1. **Respetar `prefers-reduced-motion` en todas las animaciones.** Sin excepción.
2. **No animar contenido sobre la línea de flotación** de forma que retrase el LCP. El hero
   puede animar opacidad y desplazamiento pequeño, pero el elemento LCP debe estar pintado.
3. **Duraciones entre 150 y 400 ms.** Nada más lento en interacciones. Un hover de 600 ms se
   siente roto.
4. **Las animaciones no bloquean la interacción.** El usuario puede hacer clic durante la
   transición. Nada de `pointer-events: none` mientras algo entra.
5. **Animar solo `transform` y `opacity`.** Animar `width`, `height`, `top` o `left` fuerza
   layout en cada frame.
6. **El tono se ajusta a la ocasión.** Las fichas etiquetadas `condolencias`, `acompañar` o
   `recordar` usan el registro más sobrio del sistema: fundido simple, sin rebote, sin
   escala. Ningún `type: "spring"` con `bounce` en esas vistas.

## 3. Reduced motion

Envolver la app en `MotionConfig reducedMotion="user"` es el piso, no el techo: desactiva
`transform` pero no las animaciones de `opacity` ni los loops. Para los casos donde hay que
decidir explícitamente, usar `useReducedMotion()` y devolver variantes sin desplazamiento.

Los skeletons con pulso también cuentan: con reduced motion, un skeleton estático.

## 4. Patrones

- **Escalonado** (hero, grilla de catálogo): `staggerChildren` en el contenedor, no delays
  calculados a mano en cada hijo.
- **Reordenamiento de la grilla al filtrar**: `layout` + `AnimatePresence` con `key` estable
  por `producto.id`. Sin key estable, cada filtro remonta todo y la animación parpadea.
- **Panel del carrito**: `AnimatePresence` con `initial={false}` para que no anime en el
  primer render del servidor.
- **Transiciones de página** en App Router: template.tsx, no layout.tsx — layout no se
  remonta entre rutas.
- **Componentes de Framer Motion son de cliente.** Marcar `"use client"` en la hoja más
  profunda posible; no convertir una página entera en cliente para animar una tarjeta.

## 5. Rendimiento

El objetivo recomendado del proyecto es **LCP < 2,5 s en 4G**. Antes de dar por buena una
animación en una vista con imágenes de producto, verificar que no desplazó el LCP ni
introdujo CLS. Una animación de entrada que mueve el layout es CLS, no elegancia.

Ver también la skill `ui-ux-pro-max` para el sistema visual y los componentes.
