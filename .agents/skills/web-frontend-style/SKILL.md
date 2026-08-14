---
name: web-frontend-style
description: Design, implement, audit, or refine production Web interfaces using HakuStyle's source-distilled visual system, responsive layout archetypes, readable typography, rounded component language, semantic themes, complete interaction states, and anti-generic review. Use for websites, blogs, documentation, dashboards, tools, archives, personal pages, navigation, sidebars, search, menus, cards, galleries, media, theme controls, motion, or when translating a visual reference into React, Vue, Astro, VitePress, WordPress, Tailwind, or framework-neutral HTML/CSS/JavaScript.
---

# HakuStyle Web Frontend

Build Web interfaces that are readable, rounded, task-led, cool, clean, and
comparatively neutral. Preserve the repository's framework, semantics, content,
and working behavior. Distill visual references into reusable decisions; do not
copy third-party code, fonts, characters, logos, images, textures, cursors, audio,
or brand assets without separately verifying permission.

## Required references

Read references progressively, but treat the first two as mandatory for every
visible UI change:

1. Read `references/typography-density-system.md` for type sizes, control density,
   rounded geometry, surfaces, borders, transparency, and decoration semantics.
2. Read `references/anti-ai-ui-checklist.md` before implementation and again during
   final review.
3. Read `references/layout-archetypes.md` when changing page structure, navigation,
   sidebars, responsive order, galleries, profiles, or floating utilities.
4. Read `references/interaction-motion-system.md` when changing state, feedback,
   overlays, search, theme switching, drag, carousel, reveal, or animation.
5. Read `references/theme-selection-matrix.md` and
   `references/core-palette-system.md` whenever choosing or changing color, theme,
   wallpaper, glass, or themed material.
6. Read `references/source-contribution-index.md` when selecting source recipes or
   checking how the complete 32-source corpus contributes to a design.
7. Read `references/usage-choice-workflow.md` when the request is open-ended, the
   user asks to choose/compare styles, or a style contract has not been established.
8. Read only the relevant section of
   `references/frontend-style-distillation-sources.md` when a task names a source,
   requires evidence/attribution, or may reuse a licensed implementation.

## Non-negotiable baseline

Unless an established product system has a stronger accessible baseline, use:

```text
body: 16px / 24px
control label: 15px / 22px
metadata minimum: 13px / 20px
control height: 44px
touch target: at least 44px
control radius: 10px
menu radius: 12px
card radius: 16px
panel radius: 18px
default surface: opaque or high-opacity
default border: quiet neutral 1px, only when needed
```

- Use rounded components by default. Square/hard geometry requires a named FF7,
  pixel, terminal, xlrt, Win7, or desktop-window recipe and stays inside its scope.
- Do not shrink required product copy below the baseline to fit a weak layout.
- Do not make border and text the same saturated color in a normal state.
- Do not use glass as a global default. Important text and controls need a stable,
  readable surface.
- For low-cost tool chrome, prefer PokeRNGKit's solid-backed glass recipe: an opaque
  tinted shell, `.06-.08` inner control fills, quiet light borders, graded scrims,
  and opaque content panels. Do not claim or require blur when none is used.
- Do not add isolated decorative dots, orbs, blobs, bokeh, glow, badges, or lines
  without a state, navigation, material, or identity purpose.
- Do not put cards inside cards or turn every page section into a floating card.

## Workflow

### 1. Inspect the product

- Identify framework, routes, component library, tokens, theme mechanism, icon and
  font systems, data states, breakpoints, and existing interaction conventions.
- Inspect the current UI at phone, `1280px` laptop, and desktop widths before
  restyling. Find overflow, sidebar collision, hidden controls, small text, and
  unstable state changes.
- Record primary platform, supported platform, and out-of-scope platform. Treat
  pointer, touch, keyboard, safe area, network, and GPU as separate constraints.
- Preserve working semantics, content order, data flow, and keyboard behavior
  unless the requested change explicitly replaces them.

### 2. Identify the real task

Write one sentence naming what the user must accomplish most often. Give that task
the largest continuous region and the shortest interaction path. Do not begin with
cards, a hero, gradients, or a component library showcase.

Classify the product as one primary type:

- operational workspace;
- reading/documentation;
- personal archive/profile;
- editorial gallery;
- mobile control surface;
- explicit desktop/JRPG window experience.

### 3. Select by layer

Use the whole source corpus as review knowledge, but keep the visible composition
coherent:

1. Choose one foundation: the repository's system, Ant Design, Ant Design Vue,
   daisyUI, or equivalent semantic component rules.
2. Choose one page shell from `layout-archetypes.md`.
3. Add only task-required component recipes such as sidebar, search, context menu,
   floating rail, player, gallery, form, table, card, or carousel.
4. Add zero or one signature effect such as FF/JRPG frame, Pokemon foil, Balatro
   shader, pixel heading, custom cursor, or draggable decorative character.

Do not visually blend every collected source. "Use all sources" means every source
contributes to selection and review; it does not mean every page displays all
materials simultaneously.

### 4. Ask focused choices when direction is open

Use `references/usage-choice-workflow.md`. Ask no more than three high-impact
questions in the first round, with two to four mutually exclusive answers each.
Put the recommended answer first and explain its outcome briefly.

Prioritize:

1. product shell;
2. two or three product-compatible themes;
3. information density.

Ask shape, material, and motion only when their answers would materially change the
result. Do not ask the user to choose among 32 source names. Do not repeat questions
whose answers are already explicit in the request or repository.

### 5. Write a style contract before editing

Record:

```text
platform and input model
product type and primary task
foundation system
page archetype
type/density profile
rounded geometry tokens
base theme and light/dark behavior
task component recipes
zero-or-one signature effect
explicit exclusions
```

When requirements are open-ended, offer at most three outcome-based directions,
not dozens of source names. If implementation is requested and no choice is
necessary, choose the least conflicting direction and proceed.

### 6. Choose theme semantically

Use Ant Neutral by default while retaining HakuStyle's larger type and rounded
geometry. Select alternatives by product fit:

- Ant Neutral: general products, tools, dashboards, forms, tables, settings.
- Royal Blueprint: structured archives, catalogs, research or desktop collections.
- HakuDex Azure: Pokemon/JRPG tools, game records, expressive Haku identity.
- Indigo Night: dark workbenches and low-noise high-density archives.
- Frosted Lilac: cool creative/personal products with restrained softness.
- Blue Archive Dual: thematic blogs/docs with blue day and violet night.
- Sakura Mist: explicitly soft pink reading and personal content.

Do not propose green-led themes, foggy low-contrast palettes, Noctis Mobile, Nord
Aurora, Glacier Teal, Arctic Slate, or Cerulean Paper as defaults. Keep success
green as a semantic status rather than a brand family.

Change semantic tokens across themes; do not change layout, control dimensions,
status meaning, or interaction logic.

### 7. Build stable structure

- Use Grid/Flex with explicit tracks, `minmax`, stable aspect ratios, and reserved
  space for dynamic content.
- Use whitespace and page bands for hierarchy. Use cards for independent objects,
  tools, records, summaries, previews, or selectable items only.
- Recompose on mobile: reorder tasks, collapse secondary rails, replace desktop
  sidebars with labelled drawers, and replace dense collage with mobile-native
  patterns. Do not proportionally shrink desktop layouts.
- Keep prose between `680px` and `760px`.
- Keep operational sidebars around `240-272px` expanded and `68-76px` collapsed,
  with `44-48px` rows. Synchronize the main content track so the sidebar never
  covers clickable content.
- Account for `env(safe-area-inset-*)` in bottom bars and floating utilities.

### 8. Build complete components

Define each component by anatomy and independent purpose, appearance, size, shape,
state, and responsive behavior.

Implement relevant states:

```text
default, hover, active, focus-visible, selected/checked,
disabled, loading, read-only, invalid, warning, success, empty
```

- Use native elements and attributes first.
- Keep labels persistent; do not use placeholder-only forms.
- Preserve hit-area and label width during state changes.
- Use icons from the repository's enabled icon library. Add tooltips for unfamiliar
  icon-only commands.
- Keep danger actions separate and choose feedback strength by consequence.
- Give overlays accessible names, focus containment, Escape/close behavior, scroll
  locking, and focus restoration.
- Give context-menu commands another normal entry point and preserve native menus
  for inputs, editable content, and selected text.

### 9. Apply motion as state explanation

Use the timing and state models in `interaction-motion-system.md`.

- Keep direct control feedback around `80-220ms`, overlays around `220-300ms`,
  content switches around `240-360ms`, and theme transitions around `320-500ms`.
- Animate only properties that explain continuity or state. Never use
  `transition: all`.
- Non-clickable cards do not lift on hover.
- Use at most one persistent identity animation and at most one expensive page
  effect.
- Provide `prefers-reduced-motion`, hidden-page pause, cleanup, and static fallback
  for reveals, canvas, shader, carousel, foil, parallax, and media animation.

### 10. Remove generic generated styling

Run `references/anti-ai-ui-checklist.md`. In particular remove:

- equal-size modules with equal emphasis;
- oversized headings in tools and compact panels;
- generic marketing subtitles and instructional filler;
- global glass, broad purple-blue gradients, and decoration-only balls/blobs;
- excessive pills, badges, outlined cards, and accent-colored borders;
- identical fade-up animation on every section;
- visual controls without realistic loading, error, empty, disabled, and long-text
  states.

Perform the subtraction tests: disable color, animation, wallpaper, and 30% of
decoration. The hierarchy and workflow must still be understandable.

### 11. Verify before delivery

- Render at `360-390px`, `768px`, `1280px`, normal desktop, and wide desktop.
- Verify long Chinese/English labels, zoom, text overflow, horizontal scroll,
  sidebar/overlay collision, and layout shift.
- Verify keyboard, touch, screen-reader names/status, focus restoration, and safe
  areas.
- Verify light, dark, system resolution before paint, theme persistence, and
  contrast on actual surfaces.
- Verify loading, slow loading, empty, error, disabled, selected, expanded,
  collapsed, and reduced-motion states.
- Inspect the console and clean up observers, listeners, animation frames, media,
  WebGL, and portal state.
- Recheck licenses before reusing any third-party implementation or asset.

## Source roles

Use `references/source-contribution-index.md` for the complete second-pass mapping.
At a high level:

- Ant Design, Ant Design Vue, daisyUI, Zhilu articles, and 7.css contribute
  semantics, tokens, states, focus, and complete workflow behavior.
- Clarity, Haku76, Blue Archive, Mizuki, and Sakurairo contribute reading shells.
- Lunora and Home Assistant contribute desktop and mobile operational structure.
- CRWeb, xlrt, Soki, Gaoice, and Hurt-in-dream contribute profile, gallery, and
  editorial composition.
- Leonus, Bikari, Imsyy, and Uiverse contribute focused utility components.
- FF7, Dogument, Balatro, React Bits, and Pokemon cards contribute scoped expressive
  materials and interaction effects.
- Nord contributes dark semantic color roles, not the preferred global palette.

## Maintenance

After changing this skill, run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate.ps1
```

Treat validation failure as blocking. Keep detailed evidence in references and the
main workflow in this file; avoid duplicating entire source summaries here.
