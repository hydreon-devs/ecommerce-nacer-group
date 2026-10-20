# Occasions section (Home) — Design

Date: 2026-10-20 · Status: approved

## Goal

Show the occasions Crisálidas products can be bought for, as a row of tilted
polaroids that reuse the hover animation of the Framer "Polaroid Footer"
component. Placed right after "Cómo trabajamos" (`ValueProps`) on the Home.

Occasions, in this order: Cumpleaños · Aniversario · Boda · Condolencias ·
Grados · Nacimiento o bautizo · Recuperación · Felicitaciones · Fecha especial.

## Decisions

- **Not clickable for now.** The database has no `ocasiones` data yet
  (`ProductCard.tsx`, `ColeccionChips.tsx`), so linking to a filtered catalog
  would promise a filter that does nothing. Links are added when the data exists.
- **Same Framer effect on all nine cards, Condolencias included.**
  `nacer-motion` §2.6 restricts motion on product views tagged `condolencias`;
  this Home section is a mixed index, not one of those views. The scope is
  clarified in the skill so it is not read as an exception.
- **Infinite marquee** (revised after approval): the row auto-scrolls
  continuously and loops seamlessly, in pure CSS. The prev/next arrows are
  removed; a single pause/play button remains (WCAG 2.2.2: it is the only
  pause path on touch, where hover does not exist and cards are not focusable).
- **Reduced motion**: no marquee and no toggle; a static row with native
  `overflow-x` + `scroll-snap` (single copy) keeps all content reachable.

## Reference animation (extracted from the Framer module)

- Row with `gap: 36px`, clipped overflow, horizontally draggable.
- Each card rests at a fixed tilt between −6° and 6°.
- `whileHover`: `rotate: 0, y: -18, scale: 1.04`,
  transition `{ type: "spring", duration: 0.35, bounce: 0.25 }`.

## Content

`lib/content/home.ts` → `OCCASIONS: { id, name, tilt }[]`. `tilt` is a fixed,
deterministic value per card within ±6° (never random: it would break SSR
hydration).

Heading: `SectionLabel` "Ocasiones" + `h2` "Para cada momento que importa".

## Components

- `components/home/OccasionsSection.tsx` — server. Header with
  `RevealSection`, same structure as `ValueProps`.
- `OccasionsRail` — client. The list is rendered twice in one track (the copy
  is `aria-hidden` + `inert`), animated `translateX(0) -> -50%` with a CSS
  `@keyframes`, `linear infinite`, ~50 s per loop (`marqueeDurationSeconds`).
  Each list has `pr-9` equal to the gap so the loop has no jump. Paused by
  `:has(li:hover)`, `:focus-within` and the toggle (`data-paused`). The toggle
  mirrors `FeaturedCarousel` (PauseIcon/PlayIcon, label flips). The scroller
  region has `tabIndex=0` and an `aria-label`.
- `Polaroid` — client leaf. Light frame with a thicker bottom border, 4:5 image
  area with `ImagePlaceholder`, occasion name below in `font-display`. Not
  focusable, no link, no button.

## Motion

- Rest: `rotate: tilt`. Hover: Framer values above (350 ms, within 150–400 ms).
- The loop is an ambient animation, so the 150–400 ms rule applies to the hover
  spring, not to the loop. Only `transform` is animated.
- `prefers-reduced-motion`: handled in CSS (`MotionConfig` does not stop CSS
  loops, and CSS avoids a hydration mismatch): no animation, no toggle, no
  duplicated copy. Cards stay tilted and static, no hover transform.
- Lift is not clipped: scroller gets vertical padding plus a negative margin
  (same technique documented in `FeaturedCarousel`). Hovered card gets `z-10`.
- `nacer-motion` §1 gets a new zone row; §2.6 gets the scope clarification.

## Integration

`app/(storefront)/page.tsx`: `<OccasionsSection />` between `<ValueProps />` and
`<Recorrido />`; update the section-order comment.

## Tests (strict TDD)

- `OCCASIONS` has the nine occasions in order, tilts within ±6°.
- Section renders nine polaroids with no links or buttons inside the cards.
- With reduced motion, no hover transform is applied.
