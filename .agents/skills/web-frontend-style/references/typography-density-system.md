# Typography, Density, Shape, and Material System

Use this reference whenever a task creates or changes visible Web UI. These are
HakuStyle defaults, distilled a second time from the collected blogs, component
systems, dashboard shells, game interfaces, and personal sites. Existing product
tokens may override them only when their readability and interaction quality are
at least as strong.

## 1. Default character

HakuStyle is readable, rounded, cool, clean, and comparatively neutral. It is not
a tiny enterprise UI, a borderless wireframe, or a transparent glass showcase.

- Use `16px` as the default product body size.
- Use rounded controls and containers as the default visual language.
- Use opaque or high-opacity surfaces for primary content.
- Use neutral borders that are quieter than text.
- Let hierarchy come from size, weight, spacing, and grouping before color or
  effects.
- Keep expressive pixel or display faces on short labels and identity headings.

## 2. Type roles

Do not invent a new scale for each page. Select one density profile, then use the
role values consistently.

### Standard product profile

This is the default for tools, dashboards, search, settings, archives, and mixed
desktop/mobile products.

| Role           | Size / line height | Weight  | Typical use                   |
| -------------- | ------------------ | ------- | ----------------------------- |
| Page title     | `32px / 40px`      | 600-700 | One title per route           |
| Section title  | `24px / 32px`      | 600     | Major content division        |
| Panel title    | `20px / 28px`      | 600     | Drawer, card, settings group  |
| Strong body    | `17px / 26px`      | 500-600 | Lead text, important values   |
| Body           | `16px / 24px`      | 400     | Default UI copy               |
| Control label  | `15px / 22px`      | 500-600 | Buttons, inputs, tabs, nav    |
| Secondary      | `14px / 22px`      | 400-500 | Metadata and secondary labels |
| Micro metadata | `13px / 20px`      | 500     | Timestamps, technical hints   |

Never use micro metadata for navigation, input values, required instructions,
errors, or primary status. Do not use text below `13px` in a normal product UI.

### Comfortable reading profile

Use for blogs, documentation, article readers, and content-heavy personal sites.

| Role          | Size / line height                          | Weight  |
| ------------- | ------------------------------------------- | ------- |
| Article title | `38px / 48px` desktop, `32px / 42px` narrow | 650-700 |
| H2            | `28px / 38px`                               | 600-700 |
| H3            | `22px / 32px`                               | 600     |
| Lead          | `19px / 31px`                               | 400-500 |
| Body          | `17px / 30px`                               | 400     |
| Caption       | `14px / 22px`                               | 400-500 |
| Code          | `14px / 23px`                               | 400-500 |

Keep the reading column between `680px` and `760px`. Use the narrower end for
dense Chinese text and the wider end when code blocks or mixed-language prose are
common.

### Compact workspace profile

Use only when data density is a real product requirement, such as tables, logs,
or professional editing tools. Compact means tighter spacing, not unreadable type.

| Role          | Size / line height | Weight  |
| ------------- | ------------------ | ------- |
| Page title    | `28px / 36px`      | 600-700 |
| Section title | `22px / 30px`      | 600     |
| Panel title   | `18px / 26px`      | 600     |
| Body          | `15px / 22px`      | 400     |
| Control label | `14px / 20px`      | 500-600 |
| Metadata      | `13px / 19px`      | 400-500 |

Do not activate compact density merely because the page is desktop-only. Require
evidence that the user benefits from seeing more simultaneous records or controls.

## 3. Font behavior

- Prefer a readable system or licensed sans-serif for product text and long-form
  body copy. Keep the CJK fallback adjacent to the Latin face and inspect their
  x-height, baseline, punctuation, and weight match.
- Set `font-synthesis: none` when the chosen family has the requested weights and
  styles. Do not ask the browser to fake bold or italic for a display face.
- Keep `letter-spacing: 0`. Do not use negative tracking to simulate polish.
- Do not scale font size with viewport width. Change roles at explicit breakpoints
  only when the composition changes.
- Set `text-size-adjust: 100%`; test Chinese, Latin, digits, full-width punctuation,
  long English tokens, and font-loading fallback.
- Use tabular numbers for counters, timers, tables, and changing measurements when
  alignment matters.
- Use pixel fonts only for short JRPG labels, dialogue, navigation, or headings.
  Preserve a readable sans-serif for forms, long articles, and dense tables.

## 4. Density and control geometry

Choose one profile for a surface. Do not mix random heights in the same toolbar or
form.

| Profile             | Control height | Icon button | Field horizontal padding | Row height |
| ------------------- | -------------- | ----------- | ------------------------ | ---------- |
| Compact workspace   | `40px`         | `40px`      | `12px`                   | `40-44px`  |
| Standard product    | `44px`         | `44px`      | `14px`                   | `44-48px`  |
| Comfortable / touch | `48px`         | `48px`      | `16px`                   | `48-56px`  |

- Default to the standard profile.
- Use a minimum `44px` pointer target on touch surfaces even when the visible icon
  is `18-20px`.
- Use `48-56px` search inputs when search is a primary action, following the
  Blue Archive and Uiverse search observations.
- Keep a sidebar navigation row at `44-48px`; never compress labels until adjacent
  rows become difficult to hit.
- Reserve label width during loading and selection changes so controls do not jump.
- Treat density as a geometry contract, not a font-size switch. A density profile
  must coordinate control height, touch target, row height, panel padding, field
  gaps, grid tracks, table rows, and responsive spacing; changing only text size
  is invalid. Standard density keeps `44px` controls and touch targets, while a
  compact profile may use `40px` desktop controls only when the task benefits and
  must restore at least `44px` targets on touch surfaces.

## 5. Spacing

Use the following scale:

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64
```

- `4-8px`: icon internals, tightly related metadata.
- `8-12px`: icon-label gaps, compact control groups.
- `12-16px`: control padding, card internals, list rows.
- `20-24px`: panel padding and related component groups.
- `32-40px`: section separation.
- `48-64px`: page bands and major reading transitions.

Use proximity to show relationships. Do not put every field or paragraph in a
separate outlined box merely to create separation.

## 6. Rounded shape language

Rounded geometry is the HakuStyle default. Square geometry requires a named retro,
pixel, terminal, or desktop-window recipe.

| Element                         | Default radius | Allowed range |
| ------------------------------- | -------------- | ------------- |
| Checkbox, tiny marker           | `5px`          | `4-6px`       |
| Button, input, select           | `10px`         | `8-12px`      |
| Menu item, sidebar row          | `10px`         | `8-12px`      |
| Popover, menu, tooltip shell    | `12px`         | `10-14px`     |
| Card                            | `16px`         | `12-18px`     |
| Drawer, modal, search panel     | `18px`         | `16-20px`     |
| Editorial image / Bento feature | `20px`         | `16-24px`     |

- Keep nested radii proportional: child radius should usually be parent radius
  minus its inset.
- Use fully circular shapes only for icon-only actions, avatars, progress rings,
  or a source-specific floating rail.
- Use pills only for short filters, segmented choices, tags, and statuses. Do not
  turn ordinary text buttons, nav links, and every container into pills.
- Do not remove radii because Ant Design or another library starts from a smaller
  default. Override its public radius tokens coherently.

## 7. Borders, fills, and elevation

The default layer order is: solid/high-opacity fill, quiet neutral border when
needed, and usually no shadow. A component does not need all three. Do not use an
opaque, broad, high-contrast `box-shadow` as a decorative outline. Reserve
directional shadow for drawers, popovers, floating panels, or a named material
recipe where it communicates a real layer boundary.

- Keep default borders near the surface family, not the text color. A border and
  label must not share the same saturated blue, purple, pink, or red unless the
  component is selected, invalid, warning, or focused.
- Use `1px` borders for structure. Use `2px` only for focus, game frames, or an
  explicit themed shell.
- Keep ordinary navigation and control state markers at `1px` maximum. Do not use
  `border-left`, `border-right`, or accent bars of `3px` or more for selected rows;
  use a filled selected surface and stable text hierarchy instead.
- Prefer a filled hover/selected surface over recoloring both border and text to
  the same accent.
- Avoid outlining every card. Use whitespace or a subtle elevation when the card
  is already an independent object.
- Do not use deep black shadows on normal product cards. Reserve directional or
  hard shadows for xlrt, FF7, Win7, or another named material recipe.

## 8. Transparency and glass

Primary content is opaque by default. Glass is a selected material recipe, not a
global synonym for modern design.

- For normal panels use an opaque surface.
- For readable glass over a controlled wallpaper, begin around `0.88-0.94` alpha
  in light mode or `0.80-0.90` in dark mode, then verify the actual background.
- Use deeper transparency only for low-information decorative tiles or a named
  immersive profile composition. Place important text and controls on an opaque
  inner surface or strengthen the local scrim.
- Keep blur within roughly `12-20px` for ordinary glass. Values near the
  Hurt-in-dream `28px` recipe are allowed only for a deliberate personal/Bento
  shell with a solid fallback and performance check.
- Never use a transparent border as the only grouping cue. Never put transparent
  text, muted text, and a moving wallpaper together.
- Provide a no-wallpaper or solid-surface mode when personalization exposes glass
  or wallpaper controls.

### PokeRNGKit solid-backed glass chrome

Use this recipe for operational navigation and floating utilities when the product
needs a cool glass impression without the readability and GPU cost of real blur.
The observed source does not use `backdrop-filter`.

1. Start with an opaque cool-tinted shell for the top bar, sidebar, footer, or
   command rail. Do not make the page content surface transparent.
2. Place controls inside that shell using a white fill around `.06-.08`, a light
   border around `.20-.28`, and `8-10px` radii. Use about `.045` for a quiet hover
   layer and a cool accent fill around `.16-.20` for selection.
3. Separate depth mechanisms: a small directional shadow for fixed chrome, a larger
   shadow for drawers/floating panels, and scrims around `.28`, `.46`, and `.66` for
   utility, drawer, and modal layers respectively.
4. Keep content panels, forms, tables, dropdowns, and long text on opaque surfaces.
   The glass impression belongs to navigation chrome and compact controls.
5. Preserve geometry across themes and states. Recommended source-derived sizes are
   `40px` chrome buttons, `46px` sidebar rows, `48px` floating tools, `14px` rail
   radius, `16px` content-card radius, and `18px` floating-panel radius.
6. If a wallpaper genuinely requires background blur, treat it as an enhancement:
   raise the shell fill to the ordinary readable-glass alpha range above, add a
   bounded `12-16px` blur behind `@supports`, and retain the opaque tinted fallback.

```css
.glass-chrome {
  --chrome-bg: #102344;
  --chrome-control: rgb(255 255 255 / 0.06);
  --chrome-border: rgb(255 255 255 / 0.24);
  --chrome-selected: rgb(123 167 241 / 0.18);

  color: #f7fbff;
  background: var(--chrome-bg);
  border: 1px solid var(--chrome-border);
  box-shadow: 0 8px 24px rgb(9 16 35 / 0.22);
}

.glass-chrome__control {
  min-width: 40px;
  min-height: 40px;
  border: 1px solid var(--chrome-border);
  border-radius: 10px;
  background: var(--chrome-control);
}

.glass-chrome__control[aria-current="true"],
.glass-chrome__control[aria-pressed="true"] {
  background: var(--chrome-selected);
}
```

Do not call this a backdrop-blur implementation in documentation or code comments.
Name it `glass-chrome`, `frosted-chrome`, or `solid-backed-glass` so the fallback is
understood as the actual material rather than a degraded accident.

## 9. Decoration semantics

Every visible ornament must have a role.

- A dot may indicate pagination, online state, unread state, drag position, or a
  deliberate texture. It may not appear as an isolated decorative ball beside a
  heading or inside empty space.
- A glow may identify focus, selection, rarity, or one product signature. It may
  not surround every card and button.
- A gradient may communicate material, depth, or a chosen game theme. It may not
  replace hierarchy on a standard tool page.
- A line may divide groups or anchor a selected tab. It may not mirror text color
  without a state reason.
- A badge must encode a real status, category, count, or permission.

When an ornament has no answer to "what information or interaction does this
explain?", remove it.

## 10. Baseline tokens

```css
:root {
  --hs-font-body: 16px;
  --hs-line-body: 24px;
  --hs-font-control: 15px;
  --hs-control-height: 44px;
  --hs-radius-control: 10px;
  --hs-radius-menu: 12px;
  --hs-radius-card: 16px;
  --hs-radius-panel: 18px;
  --hs-border-width: 1px;
  --hs-space-1: 4px;
  --hs-space-2: 8px;
  --hs-space-3: 12px;
  --hs-space-4: 16px;
  --hs-space-5: 20px;
  --hs-space-6: 24px;
  --hs-space-7: 32px;
  --hs-space-8: 40px;
  --hs-space-9: 48px;
}
```

Map these values through the repository's own token or theme API instead of
creating a parallel CSS system when one already exists.
