# 0001 — `proxy.ts` en vez de `middleware.ts` para proteger `/admin`

**Fecha:** 2026-09-11 · **Estado:** Aceptada · **Spec relacionada:** `specs/002_mvp_panel_administracion`

## Contexto

`specs/002_mvp_panel_administracion/plan.md` diseñó la puerta de acceso del panel como un
`middleware.ts` en la raíz del repo, usando `@supabase/ssr` para verificar sesión antes de
servir cualquier ruta bajo `/admin`. Es el patrón estándar de Next.js documentado en
prácticamente todo el ecosistema hasta la versión 15.

Al implementarlo contra Next.js 16.3.5 (la versión real instalada en este proyecto),
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md`
resultó ser una página de un párrafo: *"El convenio de archivo `middleware.js` está
deprecado en Next.js 16 y renombrado a `proxy.js`"*. `CLAUDE.md` de este repo ya advertía
explícitamente de este riesgo: *"Este Next.js puede tener cambios que rompen tu
entrenamiento — lee la documentación real antes de escribir código"*.

## Decisión

El archivo se llama `proxy.ts`, exporta una función `proxy` (no `middleware`), y vive en la
raíz del repo exactamente donde iba `middleware.ts`. El comportamiento interno —verificar
sesión con `@supabase/ssr`, redirigir a `/admin/login` sin sesión, redirigir a `/admin` con
sesión en la página de login— no cambió en absoluto. Es un cambio de nombre de archivo y de
export, no de diseño.

## Alternativas consideradas

Ninguna real: no hay forma de usar el convenio antiguo en Next.js 16 — `middleware.ts`
simplemente no se ejecuta.

## Consecuencias

- Cualquier búsqueda futura de "middleware" en este repo (código, specs viejas, memoria de
  un agente) debe traducirse mentalmente a `proxy.ts`. `specs/002.../plan.md` §3.1 ya se
  corrigió para decir esto explícitamente.
- Si el proyecto algún día vuelve a bajar de versión de Next.js (improbable), este archivo
  necesitaría renombrarse de vuelta.
