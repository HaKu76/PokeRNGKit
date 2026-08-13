# Theme Selection Matrix

Use this reference with `core-palette-system.md` whenever selecting a visual
direction. A HakuStyle theme is a semantic palette plus controlled material and
signature allowances. It is not a new layout, a random color preset, or permission
to decorate every component.

## Selection order

1. Preserve an established product theme when replacement would break brand or
   user expectation.
2. Classify product, platform, task density, content type, preferred mode, and
   effect budget.
3. Select one base theme from the matrix.
4. Select one page archetype from `layout-archetypes.md`.
5. Select task-required component recipes.
6. Select zero or one signature effect.
7. Write exclusions before implementation.

The palette may switch between light and dark. Layout, control size, state meaning,
and interaction behavior must remain stable.

## Default geometry shared by every theme

Do not inherit an upstream library's smaller or square geometry unchanged.

```text
body: 16px / 24px
control label: 15px / 22px
control height: 44px
control radius: 10px
menu radius: 12px
card radius: 16px
panel radius: 18px
border: neutral 1px only where needed
```

Retro/JRPG/window recipes may locally override the geometry inside their scoped
shell. The rest of the product remains on the shared rounded baseline.

## Theme matrix

| Theme             | Best fit                                                | Surface and shape                                                         | Signature allowance                                  | Avoid                                                                    |
| ----------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Ant Neutral       | General tools, dashboards, settings, data products      | Crisp opaque neutrals, rounded controls, restrained elevation             | One blue focus/action system                         | Flat square enterprise defaults, blue borders around everything          |
| Royal Blueprint   | Archives, catalogs, research tools, desktop collections | Structured blue-neutral surfaces, clear grouped navigation                | Thin blueprint/grid cue or one framed archive module | Turning all text/borders blue, military darkness                         |
| HakuDex Azure     | Pokemon/JRPG tools, collections, game profiles          | Deep or cool blue shell, opaque readable panels, rounded product controls | One FF/JRPG frame or Pokemon material focus          | Gold as default action, pixel font for long body, many glow layers       |
| Indigo Night      | Dark workbenches, developer tools, low-noise archives   | Near-indigo page, distinct elevated surfaces, clear pale text             | One subtle lilac identity accent                     | Foggy low contrast, pure black, constant neon                            |
| Frosted Lilac     | Creative tools, portfolios, personal products           | Cool lilac-neutral solid surfaces, soft rounded panels                    | Limited translucent identity area                    | Pink/warm takeover, global glass, purple gradient everywhere             |
| Blue Archive Dual | Blogs, docs, youthful cool themed sites                 | Day: blue-white; night: violet-black; matched rounded chrome              | Themed top/footer frame or search panel              | Character assets, yellow body text, mixing both modes at once            |
| Sakura Mist       | Reading, calm personal blogs, soft portfolios           | Warm-light neutral reading surface, pink action, periwinkle links         | One quiet cover or floral identity cue               | Pink status semantics, excessive sweetness, decorative petals everywhere |

## Product-to-theme decisions

### Use Ant Neutral when

- the product is operational and content/function should dominate;
- the existing component library is Ant Design, Ant Design Vue, daisyUI, or a
  comparable tokenized system;
- the request does not establish a stronger identity;
- accessibility, mixed data visualization, and long-term maintainability dominate.

Ant Neutral in HakuStyle still uses visible rounded controls and `16px` body text.
Do not equate neutral with sharp, tiny, or emotionless.

### Use Royal Blueprint when

- navigation, collection hierarchy, and technical organization should feel
  deliberate;
- the product is a desktop-first catalog, archive, research tool, or game database;
- blue identity is desired without HakuDex's overt JRPG material.

### Use HakuDex Azure when

- the product explicitly relates to Pokemon, JRPGs, game records, or Hakuhiro's
  archive identity;
- one game-like shell or featured card would help establish identity;
- common forms, tables, and settings can remain modern and readable.

### Use Indigo Night when

- dark mode is the main working environment;
- the user needs extended focus and high information density;
- the product benefits from depth but should remain quieter than neon/cyberpunk.

### Use Frosted Lilac when

- the page is personal or creative, but pink and warm colors should not dominate;
- a softer identity is wanted without sacrificing clean neutral organization;
- a limited glass or wallpaper region is explicitly valuable.

### Use Blue Archive Dual when

- a blog or documentation shell should have visibly different day and night
  identities;
- top navigation, search, and footer are the main themed chrome;
- content remains a conventional readable document underneath.

### Use Sakura Mist when

- the user explicitly asks for a soft pink reading mood;
- the primary task is reading, browsing posts, or viewing a calm portfolio;
- decoration can remain secondary to prose.

## Semantic theme contract

Every theme must provide:

```text
page, surface, surface-elevated, surface-selected, scrim
text, text-secondary, text-muted, inverse
border, divider
brand, brand-hover, brand-active, on-brand
focus
success, warning, danger, info and readable content pairs
shadow-low, shadow-medium
glass-surface and glass-border only when glass is enabled
```

- A filled semantic token needs a readable content pair.
- Success may remain green even though green-led themes are rejected.
- Status meanings must not change between themes.
- Border colors stay neutral by default; selected/error/focus borders may use
  semantic accents.
- Text never inherits an accent merely because its containing component has an
  accent border.

## Theme controls

- Default control: `system / light / dark` segmented choice or menu, depending on
  available space.
- Show named palette choices only when the product genuinely supports multiple
  brand themes. Do not put seven palettes into every toolbar.
- Personalization panels may expose wallpaper and transparency separately from
  color theme, following Imsyy/Mizuki. Include preview, persistence, reset, and a
  readable default.
- Keep theme switching available through a conventional button/menu even when a
  context menu or floating rail also exposes it.

## Material compatibility

| Material                 | Compatible themes                                           | Conditions                                                          |
| ------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| Solid rounded product UI | All                                                         | Default                                                             |
| Limited glass            | Frosted Lilac, Blue Archive Dual, Sakura Mist, HakuDex dark | Controlled background, high-opacity reading surface, solid fallback |
| FF7/JRPG frame           | HakuDex Azure, Royal Blueprint                              | Scoped shell, readable modern controls                              |
| Pokemon foil/shine       | HakuDex Azure, Royal Blueprint, Indigo Night                | One focused collectible/featured object                             |
| Balatro shader           | Indigo Night, HakuDex Azure                                 | Full-bleed identity scene only, static fallback                     |
| Win7/Aero window         | Explicit retro desktop recipe                               | PC-first, scoped component system                                   |
| Pixel font               | HakuDex/retro recipes                                       | Short text only unless verified                                     |

## Rejected defaults

- Do not make green or teal the brand family.
- Do not create a foggy low-contrast gray wash.
- Do not use Noctis Mobile, Nord Aurora, Glacier Teal, Arctic Slate, or Cerulean
  Paper as default proposals.
- Do not use broad purple-blue gradients as a shortcut for the preferred cool
  palette. Cool identity should come from semantic color relationships.
- Do not make transparency, glow, or wallpaper mandatory for any theme.

## Style contract example

```text
Platform: responsive Web, desktop primary, phone supported
Product: Pokemon probability and collection tool
Base theme: Royal Blueprint, light/dark
Geometry: HakuStyle standard, rounded 10/16/18px
Archetype: operational workspace with drawer fallback
Components: Ant-style form/table states, Lunora sidebar behavior
Signature: one Pokemon material on selected collection preview
Excluded: global glass, pixel body font, decorative dots, animated gradient borders
```
