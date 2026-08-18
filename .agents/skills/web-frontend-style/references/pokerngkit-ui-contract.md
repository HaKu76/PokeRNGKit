# PokeRNGKit Fixed UI Contract

Use this profile for every PokeRNGKit product UI change. It is a fixed owner
decision, not a theme menu or a design direction to reopen.

## Product Baseline

```text
Platform: responsive static Web; desktop primary, touch phone supported
Product: operational RNG workspace; a result table is the main scroll region
Foundation: Ant Neutral semantic tokens with HakuStyle rounded geometry
Theme: light, dark, and system preference; system is the default and persists locally
Density: standard, 16px / 24px body, 15px / 22px labels, 44px controls, 46px rows
Geometry: 10px controls, 16px panels, 18px floating panels
Motion: 160-220ms control feedback and 220-300ms drawer/panel transitions; reduced-motion fallback
```

## Shell And Navigation

- Use a solid dark chrome top bar with a compact brand, same-line Ready status,
  icon-only theme mode control, and language switcher. Do not show generation/RNG
  Lab eyebrow text or version metadata in the title region.
- Desktop navigation is a `224px` sidebar with a persisted `64px` Rail state.
  The Rail keeps `44px` numeric generation buttons. Clicking one expands the
  sidebar and its group.
- Show a `44px` search control above grouped navigation. Generation groups start
  collapsed; a query temporarily reveals matching results. Module rows display a
  single label only, without serial numbers, repeated icons, or descriptions.
- Use a labelled, focus-managed drawer with scrim on mobile. The desktop Rail must
  never leave an invisible interactive layer over workspace content.

## Surfaces And Controls

- Keep page, form, table, and panel surfaces opaque. Use quiet neutral `1px`
  borders and whitespace; ordinary panels do not use broad decorative shadows,
  thick top borders, accent gutters, or `3px` selected markers.
- Use filled selected and hover states. Focus may use a `2px` outline. Preserve
  semantic success, warning, error, and information colors without making any of
  them a dominant brand family.
- Do not show artificial sequence labels such as `01`, `02`, `PANEL STATES`, or
  preview-only explanatory eyebrow copy in product workspaces.
- Use the shared input-plus-trigger candidate control for searchable or long
  option lists. It must support pointer choice, Arrow keys, Enter, Escape, and
  a bounded mobile position. When editing an existing module, migrate its native
  selector to this pattern unless native platform selection is materially required.

## Floating Utilities

- Place the compact tool Rail in the lower-right safe area. Secondary commands
  expand upward with equal `44px` controls.
- On a fine hover pointer, expand on enter and collapse on leave; ordinary mouse
  click does not pin it. On touch, the trigger toggles the actions. Keyboard
  focus keeps actions available without mouse focus pinning the Rail.
- Floating panels open centered, can be dragged from their title bar on desktop,
  and retain scrim, Escape, focus containment, and focus restoration.

## Explicit Exclusions

- No Royal Blueprint fallback, alternative product theme picker, global glass,
  wallpaper, decorative glow, broad blue-purple gradients, or opaque high-contrast
  shadow outlines.
- No density mode that changes only font size. Any density change coordinates
  control height, row height, gaps, panel padding, and touch targets.
- Do not change these rules without an explicit owner decision. Preserve the
  isolated `?demo=hakustyle` route for reviewing the contract independently.
