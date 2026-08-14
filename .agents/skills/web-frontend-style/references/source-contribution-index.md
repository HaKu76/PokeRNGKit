# Second-Pass Source Contribution Index

This index is the second distillation of all 32 collected source groups. The
source log records evidence and attribution; this file converts that evidence into
HakuStyle responsibilities. Every source remains part of the knowledge base, but a
single page must select compatible contributions by layer instead of visually
combining all sources.

## Cross-source conclusions

### Typography

- The collected interfaces do not support a universally tiny UI. Primary search
  controls are commonly `48-56px` high, sidebar rows around `44px`, themed headers
  `60-72px`, and compact media still uses clearly differentiated `25px` titles and
  `12px` metadata.
- HakuStyle therefore defaults to `16px` product body, `15px` control labels,
  `13px` minimum metadata, and `44px` controls. Compact workspaces may use `15px`
  body and `14px` controls, but not smaller required text.
- Clarity and the font articles provide the body-typography engineering baseline;
  Dogument and Haku76 provide expressive-font boundaries; Blue Archive, Lunora,
  Uiverse search/player, and Home Assistant provide component-scale evidence.

### Rounded geometry

- Rounded form is repeatedly present across the preferred sources: `6px` floating
  tools/menu items, `10px` searches/menus/media/cards, `12px` sidebars and profile
  panels, `16px` search/gallery surfaces, `24px` editorial/Bento surfaces, and
  `32px` themed header corners.
- HakuStyle therefore uses rounded controls and containers by default. FF7, xlrt,
  7.css, and Gaoice are named exceptions whose smaller/harder geometry stays scoped
  to retro or desktop-window recipes.

### Surface and border

- Opaque surfaces from xlrt, Ant Design, daisyUI, Home Assistant, and standard blog
  content establish the product baseline.
- Glass from Haku76, Sakurairo, CRWeb, Gaoice, and Hurt-in-dream becomes an optional
  material with contrast, fallback, and performance requirements.
- PokeRNGKit adds a low-cost glass-chrome pattern: opaque tinted navigation shells,
  translucent child controls, graded scrims, and directional elevation without
  requiring `backdrop-filter`.
- Borders communicate grouping, focus, selection, danger, window material, or
  themed chrome. They do not automatically share the text or brand color.

### Layout

- Clarity and blog themes establish bounded reading.
- Lunora and Ant systems establish operational workspaces and complete state flows.
- Home Assistant establishes mobile task ordering.
- Soki establishes art-directed gallery composition.
- CRWeb and Hurt-in-dream establish profile/archive composition.
- FF7, Gaoice, and 7.css establish explicitly scoped desktop/game shells.

### Interaction

- Imsyy, Uiverse context/search/player, React Bits carousel, Leonus/Bikari rails,
  Pokemon cards, Gaoice windows, and Hurt-in-dream drag/zoom provide specific
  state models.
- Ant Design, Ant Design Vue, daisyUI, Clarity, and 7.css provide semantic control,
  focus, feedback, theme, and configuration contracts.
- Motion is bounded by purpose, reduced-motion, stable geometry, and one signature
  effect budget.

## Contribution matrix

|   # | Source                      | Primary contribution to HakuStyle v2                                                                                                                               | Platform / usage boundary                                                                             |
| --: | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
|   1 | Leonus floating menu        | Lower-right primary rail plus lateral secondary actions; stable icon geometry; collapse leaves one discoverable control; scroll/context adaptation                 | Responsive desktop Web; enlarge to `44px` hit targets and reduce actions on mobile                    |
|   2 | rhargreaves/ff7-ui          | JRPG window material, fixed selection gutter, explicit nested menu/dialog states, hard directional depth                                                           | PC/game archive shell only; modern focus and readable body typography remain mandatory                |
|   3 | Clarity blog theme          | Reading-first shell, bounded prose, side navigation/TOC, explicit light/system/dark, quiet long-form motion                                                        | Blog/docs; not an operational dashboard shell                                                         |
|   4 | Zhilu frontend articles     | Font metrics, fallback, synthesis, mixed-script testing, theme resolution before paint, semantic CSS variables                                                     | Foundational engineering for every Web surface                                                        |
|   5 | Anheyu frontend             | Product hero hierarchy, one CTA, restrained dark atmosphere, repeated rounded feature cards, responsive metrics                                                    | Marketing/product introduction only; do not import hero scale into tools                              |
|   6 | Haku76 local theme          | Personal Haku/JRPG identity, shared window geometry, 1200px `25/75` home layout, fixed-height dynamic cards, click-origin theme transition                         | Blog/archive; pixel type, particles, audio, cursor, and glass are optional enhancements               |
|   7 | Imsyy blog                  | Personalization grouped by user intent, live preview, persistence/reset; context menu command taxonomy and conventional fallback entries                           | Desktop/responsive Web; native menu remains for editable and selected content                         |
|   8 | Bikari archive rail         | Safe lower-right rail, progress/back-to-top, collapsed offscreen secondary actions, pointer-event containment                                                      | Responsive Web/PWA; respect safe area and content collision                                           |
|   9 | Uiverse reveal card         | Fixed card stage, bounded 3D reveal, visible essential content, focus/tap/reduced-motion equivalence                                                               | Optional interactive card, never hover-only                                                           |
|  10 | Uiverse search              | `56px` primary search geometry, layered focused material, reserved icon padding, semantic clear/filter actions                                                     | Use glow only as optional focus material with static fallback                                         |
|  11 | Uiverse context menu        | `200px` grouped rounded menu, inset rounded items, semantic destructive group, subtle pressed feedback                                                             | PC context/overflow menu; supply keyboard and mobile alternative                                      |
|  12 | Uiverse music player        | Compact but legible media hierarchy, stable cover/title/progress/control arrangement, playback-only equalizer                                                      | Responsive media component; volume/queue remain keyboard and touch reachable                          |
|  13 | React Bits Balatro          | Parameterized full-bleed shader identity layer, lifecycle cleanup, quality controls, static fallback                                                               | Zero-or-one signature effect on capable Web devices                                                   |
|  14 | React Bits carousel         | Shared real index, drag velocity, bounded perspective, cloned-loop encapsulation, pause conditions                                                                 | Responsive gallery/carousel; non-3D and no-autoplay fallbacks                                         |
|  15 | pokemon-cards-css           | Layered collectible material, pointer vector drives tilt/glare/shine, rarity-specific recipes, active-only compositing                                             | Featured collectible object only; no copied Pokemon assets and no global foil                         |
|  16 | Blue Archive VitePress      | `72/64px` themed chrome, large rounded header/footer framing, `48-56px` search, blue day/violet night theme semantics                                              | Blog/docs; character assets and game branding excluded                                                |
|  17 | Mizuki                      | Modular blog shell, independently configurable wallpaper/transparency/blur/layout, ultra-wide restraint, view-transition performance isolation                     | Configurable responsive blog; one active composition per route                                        |
|  18 | Sakurairo                   | Transparent-to-readable sticky header, cover-to-content transition, rounded article cards, mobile menu architecture, optional media modules                        | Blog/portfolio; global transitions and optional effects must be constrained                           |
|  19 | Lunora dashboard            | `256px` grouped sidebar, `72px` icon rail, `44px` rounded rows, fixed header/scroll nav/bottom utilities, synchronized collapse and mobile drawer                  | PC SaaS/workspace shell; labels stay available on mobile                                              |
|  20 | Dogument typography         | Real pixel-outline font requirements, glyph/advance validation, integer grid, payload/license discipline                                                           | Short retro headings/labels unless long-form readability is proven                                    |
|  21 | Gaoice desktop UI           | Explicit login/desktop state, window/taskbar synchronization, bounded drag/resize, mobile natural-flow fallback, scoped Aero material                              | PC-first interactive archive; not a default tool/blog shell                                           |
|  22 | xlrt content-container      | Stable fixed identity-card shell, opaque surface, directional elevation, fixed content viewport plus bottom state bar, non-shifting selection                      | Personal compact card; small `3-5px` radius is a named source exception                               |
|  23 | Soki image wall             | Explicit editorial Grid spans, large rounded opaque gallery surface, rounded media, mobile snap-gallery recomposition, accessible preview dialog                   | Curated finite galleries; not arbitrary dynamic masonry                                               |
|  24 | CRWeb                       | Full-viewport identity stage plus bounded archive shell, deliberate mobile order, single reveal state, custom cursor limits, animation/canvas budget               | Personal archive/portfolio; reduce transparency and continuous motion from source observation         |
|  25 | Ant Design                  | Seed/map/alias/component token derivation, complete form/table/feedback states, provider context, overlay/z-index/focus discipline                                 | Foundation for operational Web; HakuStyle overrides small type and radius defaults                    |
|  26 | daisyUI                     | Structure/appearance/size/shape separation, semantic surface-content theme pairs, nested theme scopes, composable rounded variants                                 | Foundation for multi-theme responsive Web; add full workflow states where needed                      |
|  27 | Ant Design Vue              | Ant design contract in Vue context, global provider boundary, context-aware overlays, controlled data/event flow, tree shaking                                     | Vue products; framework APIs do not transfer across stacks                                            |
|  28 | Nord Termite                | Cool dark role mapping, separated surface/text/status palettes, non-pure black/white contrast                                                                      | Dark developer surfaces only; rejected as a foggy global brand palette                                |
|  29 | 7.css                       | Semantic HTML control coverage, explicit focus/default/disabled states, scoped retro material, CSS does not replace behavior                                       | PC retro/window scope; HakuStyle rounded baseline remains elsewhere                                   |
|  30 | Home Assistant Mobile First | Single-hand task order, state plus one common action per card, safe-area bottom actions, tablet/desktop progressive enhancement                                    | Mobile Web/PWA/WebView; Noctis palette rejected while interaction structure remains valuable          |
|  31 | Hurt-in-dream               | Explicit Bento spans, prominent rounded geometry, separated wallpaper/glass/content layers, bounded drag/zoom character, solid and static fallbacks                | Personal profile/archive; source-level deep transparency and `28px` blur are not global defaults      |
|  32 | PokeRNGKit                  | Solid-backed glass chrome, `.06-.08` inner control fills, `.20-.28` light borders, graded `.28/.46/.66` scrims, directional shadows, invariant light/dark geometry | Desktop-first responsive Web tools; source has no `backdrop-filter`, and content panels remain opaque |

## Layer selection catalogue

Use the matrix to build a style contract:

- **Foundation and correctness:** 4, 25, 26, 27, 29.
- **Typography identity:** 3, 4, 6, 12, 16, 19, 20.
- **Operational shells:** 19, 25, 27, 30, 32.
- **Reading shells:** 3, 6, 16, 17, 18.
- **Profile/archive shells:** 21, 22, 24, 31.
- **Game/retro shells:** 2, 6, 15, 21, 29.
- **Navigation and utilities:** 1, 7, 8, 16, 18, 19, 32.
- **Search and commands:** 7, 10, 11, 16, 25, 27.
- **Media and galleries:** 12, 14, 15, 23.
- **Signature effects:** 9, 13, 15, 20, 24, 31.
- **Theme and personalization:** 3, 4, 6, 7, 16, 17, 18, 25, 26, 28, 32.

Every implementation should use the whole corpus as its review knowledge, but its
visible contract should normally contain one foundation, one shell, required task
components, and zero or one signature effect.
