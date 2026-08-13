---
name: web-frontend-style
description: Framework-neutral Web frontend design and implementation guidance for building or refining websites and interactive UI with semantic HTML, CSS, JavaScript, responsive layouts, accessible interactions, and deliberate visual systems. Use when Codex needs to design a new Web page, restyle an existing frontend, implement navigation, search, menus, cards, media, backgrounds, theme controls, or translate a visual reference into production-ready UI.
---

# Web Frontend Style

Use this skill to turn a visual direction into a coherent, usable Web interface. Preserve the repository's existing framework and content model; express the design in semantic HTML, CSS, and JavaScript first, then adapt the implementation to Vue, React, Astro, VitePress, WordPress, or another local stack.

Read `references/frontend-style-distillation-sources.md` when a task cites one of the collected references, asks for a named visual recipe, or needs source attribution and license boundaries. Use it as evidence and pattern guidance, never as permission to copy source code, fonts, characters, logos, images, textures, or audio.

Read `references/core-palette-system.md` whenever choosing, creating, or changing
colors. Hakuhiro prefers cool, clean, comparatively neutral palettes. Use Ant
Neutral as the default. The final preferred alternatives are Indigo Night,
Frosted Lilac, and Royal Blueprint. Use Blue Archive Dual for a more thematic
cool blog, HakuDex Azure for JRPG/archive identity, and Sakura Mist only when a
softer reading direction is explicitly preferred. Preserve an existing product
palette when replacement would conflict with established brand or user intent.

## Workflow

### 0. Classify the target platform and product

- Identify the delivery surface before choosing a reference: responsive Web, desktop-first Web, mobile-first Web, installable PWA, embedded WebView, or a native platform. HakuStyle is Web-first; do not transfer desktop-window, touch-dashboard, or terminal rules across platforms without an adaptation note.
- Record three labels in the implementation plan: **primary platform**, **supported platform**, and **out of scope**. Treat viewport size, pointer type, keyboard availability, safe-area insets, network quality, and GPU availability as separate constraints.
- Use a source only when its platform label and product density match the current task. A PC dashboard can borrow 7.css or Gaoice window geometry; a phone dashboard can borrow Home Assistant Mobile First; a long-form blog should reject both as a shell.
- Ask the user to choose a visual direction when the request is open-ended. If no choice is given, propose two or three compatible recipes with their platform and interaction tradeoffs, then select the least conflicting set. Never blend every collected source by default.

### 1. Inspect before styling

- Identify the framework, entry points, design tokens, routing model, component conventions, and existing responsive breakpoints.
- Inspect the current page at desktop and mobile sizes before changing layout.
- Preserve working semantics, content order, data fetching, and keyboard behavior unless the request explicitly changes them.
- Locate existing icon, font, animation, and theme systems. Reuse them instead of introducing parallel systems.

### 2. Choose one visual direction

Select one dominant language for the page and at most one supporting expressive effect.

- **Reading-first**: bounded text measure, quiet navigation, stable article metadata, restrained decoration, explicit light/system/dark state.
- **Retro/game window**: compact radii, hard directional bevels, high-contrast text shadows, fixed selection gutters, explicit menu/dialog state machines.
- **Themed chrome**: matched top/bottom frames, repeated border geometry, patterned material, themed accent states, conventional navigation semantics.
- **Glass/wallpaper**: opaque text and controls over a controlled image, low-alpha borders, blur only where contrast is verified, independent wallpaper/card-transparency modes. Treat glass as a bounded content surface, not a global default; provide solid/no-filter fallbacks and allow a decorative canvas or character layer only when it remains optional.
- **Immersive cover**: image/video or shader establishes identity, then a readable gradient/overlay introduces the first content hint.
- **Material card**: base art plus mask, texture, shine, glare, and a bounded pointer-driven tilt; provide a flat fallback.

Do not combine several dominant recipes merely because each looks attractive. Use the reference document to select compatible patterns and record the choice in the implementation plan.

Use this selection SOP when the user has not named an exact recipe:

1. **Apply hard filters**: platform, product type, framework, primary task, content density, input method, accessibility, performance budget, and existing brand. Reject incompatible sources before judging aesthetics.
2. **Build by layer**: choose one foundation/system, one shell/information architecture, any task-required component patterns, and at most one expressive effect. A layer may be inherited from the existing repository instead of HakuStyle.
3. **Rank candidates**: score product fit, platform fit, compatibility with the current stack, stated user preference, accessibility, and performance risk. Prefer the strongest task/platform fit, not the source with the most decoration.
4. **Resolve user intent**: if the user names a style or source, treat it as the leading candidate but still enforce platform and usability constraints. If the request is open-ended and multiple directions remain valid, present two or three distinct options with plain-language tradeoffs and ask the user to choose.
5. **Write a style contract**: record the selected sources by layer, platform labels, token direction, layout model, component density, motion budget, and excluded patterns before editing.
6. **Implement and verify**: adapt the contract to the repository's own components and test all required platforms and states. Revisit the selection only when evidence shows the contract conflicts with content or workflow.

Use the source layers as follows:

- **Foundation/system**: Ant Design, Ant Design Vue, daisyUI, Nord, or the repository's existing design system. This layer supplies tokens, states, forms, feedback, and theme mechanics; it does not dictate the page's personality by itself.
- **Shell/information architecture**: Clarity, Lunora, Home Assistant Mobile First, Haku76, Mizuki, Sakurairo, Blue Archive, Gaoice, or another page-level recipe matched to the product.
- **Task component**: floating rails, search, context menus, players, galleries, cards, carousels, forms, tables, or feedback patterns required by the workflow.
- **Expressive effect**: Balatro shader, Pokemon material, immersive reveal, custom cursor, foil, glow, or another optional signature. Keep zero or one and provide a low-cost fallback.

Do not ask the user to choose between dozens of source names. Translate candidates into outcomes such as "quiet reading", "JRPG archive", "compact enterprise", "mobile control panel", or "Windows desktop", then cite the source recipe behind each option.

### 3. Establish tokens

Define tokens before component CSS. At minimum provide:

- semantic surfaces: page, panel, elevated panel, transparent panel, scrim;
- text roles: primary, secondary, muted, inverse, link, selected;
- accents: brand, hover, active, focus, success, warning, danger;
- geometry: control size, radius, border width, spacing scale, content width, reading width, safe-area inset;
- motion: duration, easing, spring values where needed, and a reduced-motion mode;
- effects: shadow, blur, texture opacity, image brightness, and overlay opacity.

Organize reusable systems as a derivation chain rather than one flat variable list:

- **seed tokens** express sparse brand intent such as primary hue, base radius, body font, and density;
- **derived/map tokens** expand seeds into color ramps, spacing, control heights, and elevation steps;
- **semantic/alias tokens** name usage such as link, danger, selected row, panel border, and focus ring;
- **component tokens** adjust a local component without silently changing unrelated components.

Change seeds for broad themes, semantic aliases for product meaning, and component tokens for isolated exceptions. Keep default, dark, compact, and brand algorithms composable; verify combinations instead of maintaining unrelated hard-coded palettes. Allow a nested theme scope for previews or embedded areas, but inherit unspecified values from the parent.

Keep component structure independent from color, appearance, size, shape, and state modifiers. Prefer semantic theme variables with paired foreground roles, for example surface/content and primary/primary-content, so a theme can change without rewriting component markup. Scope variables and class prefixes when embedding into an existing product; include only the component styles the page actually uses when the toolchain supports it.

Use one hue or palette family only when contrast remains valid for every semantic role. Keep warning, danger, and content-image colors independent. Prefer `color-scheme` and a resolved `light`/`dark` DOM state; avoid duplicated `auto` branches.

When using a Nord-inspired palette, map Polar Night to dark surfaces, Snow Storm to text/light surfaces, Frost to primary through tertiary emphasis, and Aurora to status semantics. Do not turn every surface, text role, and status into blue; preserve the red, yellow, green, and violet distinctions and re-check contrast outside terminal-sized text.

### 4. Build stable structure

- Keep primary navigation and the main task visible at all times.
- Bound prose with a readable `max-width`; expand side rails only at deliberately wide breakpoints.
- Reserve space for dynamic titles, metadata, indicators, icons, and controls so state changes do not shift surrounding content.
- Use CSS grid/flex and stable `aspect-ratio`, `minmax`, `clamp`, or fixed tracks for cards, rails, carousels, toolbars, and post rows.
- Distinguish art-directed collage from masonry. Use explicit Grid spans for intentional compositions; use masonry only when arbitrary, content-driven heights justify it.
- Collapse or reorder secondary widgets on narrow screens instead of shrinking every element until it becomes unusable.
- For profile/archive pages, follow an identity stage with a bounded main-plus-profile shell. Define mobile source/order intentionally; do not let CSS reversal create a confusing reading or focus sequence.
- Protect `env(safe-area-inset-*)` and avoid collisions between floating rails, chat buttons, consent actions, and browser UI.
- For glass Bento/profile layouts, use explicit Grid spans for the editorial desktop composition and a deliberate single-column source order below the narrow breakpoint. Keep the content layer independent from wallpaper, blur, and decorative canvas bounds.

## Component Patterns

### Component systems and states

- Define each component by semantic anatomy and orthogonal axes: purpose, appearance, size, shape, state, and responsive behavior. Do not make one modifier class carry several unrelated decisions.
- Build one explicit state matrix for default, hover, active/pressed, focus-visible, selected/checked, disabled, loading, read-only, invalid, warning, success, and empty states where applicable.
- Keep hit-area geometry stable across states. Loading may replace or precede an icon, but it must reserve label width, expose busy state, and prevent duplicate submission without masquerading as disabled content.
- Use native elements and attributes first. Treat visual disabled classes only as presentation helpers; preserve `disabled`, `aria-disabled`, keyboard behavior, and form semantics.
- Expose a small size scale and one compact density mode. Compact mode must reduce padding and gaps coherently, not shrink only fonts or touch targets.
- In a component-library project, use its public provider, theme, token, slot, variant, and component APIs before overriding generated internal selectors. Preserve the repository's React or Vue conventions and translate design rules instead of transplanting framework-specific APIs.
- Keep global locale, direction, component size, disabled state, popup container, and empty rendering in one configuration boundary. Prefer context-bound modal/message/notification instances so imperative overlays do not escape theme or locale context.

### Forms and data workspaces

- Give every field a persistent label, optional help/constraint text, and reserved feedback area. Connect descriptions and errors programmatically; do not use placeholder text as the only label.
- Keep label alignment, required/optional markers, control height, and feedback icons consistent across horizontal, vertical, inline, and mixed layouts. Switch to a single-column reading order before labels or controls become cramped.
- Model validation as explicit untouched, validating, valid, warning, and invalid states. Validate at an intentional trigger, focus the first failed field after submission, preserve entered values, and distinguish client validation from server failure.
- Pair submit actions with loading, success, and retry feedback. Keep destructive or irreversible actions visually and spatially separate from routine submission.
- For tables, preserve header/column alignment while supporting sorting, filtering, search, selection, pagination, expansion, empty/loading/error states, and responsive overflow. Make active filters and sort direction visible and resettable.
- Keep row identity stable across pagination and remote refresh. Announce selected counts, put batch actions near the selection summary, confirm destructive batches, and virtualize only after measuring a real performance need.
- On narrow screens, prioritize columns, allow deliberate horizontal scroll with a visible cue, or transform rows into labeled records. Never hide essential values solely to avoid overflow.

### Feedback, overlays, and layering

- Choose the lightest feedback surface that fits the consequence: field message or inline alert, transient message, persistent notification, popconfirm, modal/drawer, then full result state.
- Use skeletons when the final structure is predictable, a spinner for short indeterminate work, progress for measurable work, and an explicit empty or error result when loading ends without content.
- Define one z-index ladder for base content, sticky chrome, dropdown/tooltip, scrim, drawer/modal, notification, and critical system feedback. Test nested overlays rather than increasing z-index locally.
- Render popups in a container whose clipping, scrolling, positioning, theme scope, and direction are known. Match popup width to its trigger only when it improves scanning; do not let portal placement detach feedback from context.
- Give dialogs and drawers accessible names, initial focus, containment, Escape and close behavior, scroll locking, and focus restoration. Keep notifications operable without stealing focus.

### Navigation and chrome

- Make desktop and mobile navigation separate information architectures when the desktop row cannot remain legible.
- Keep dropdowns anchored to their trigger, animate opacity/transform, and close on outside click and Escape.
- Provide a focus path through every menu. Use `aria-expanded`, `aria-controls`, and visible `:focus-visible` styling.
- Match top and bottom frame geometry only when the page benefits from a themed shell. Keep logos and branded assets licensed and replaceable.
- For transparent headers over covers, transition to a solid or blurred reading surface on scroll/focus. Do not rely on hover as the only trigger.

### Operational sidebars

- Structure a dashboard sidebar as a fixed brand header, an independently scrollable grouped navigation region, and a bottom-pinned utility region.
- Use one stable row geometry for ordinary and featured links. Express priority with semantic surface, border, shadow, accent color, and a small lift rather than changing hit-area size.
- Keep section labels compact and separators low-contrast so groups aid scanning without fragmenting the list.
- On desktop, animate a full rail (for example, `256px`) to an icon rail (for example, `72px`) by transitioning width and label opacity/width together; keep icon hit targets, active state, and expand control usable.
- On mobile, prefer a full-width drawer with a scrim, outside-click/Escape close, focus return, and scroll locking when labels are essential. Animate `translateX` with a short easing curve and keep the content layer synchronized.
- Do not make a collapsed icon rail the only mobile navigation or rely on hover-only tooltips for required labels.

### Floating utility rail

- Group actions in one lower-right rail with identical hit geometry and a stable primary column.
- Reveal low-frequency actions laterally with transform/opacity so the document does not reflow.
- Leave one expand control visible after collapse. Keep empty overlay regions `pointer-events: none`.
- Use semantic buttons, accessible names, tooltips for unfamiliar icons, Escape/outside-click close, and reduced-motion fallbacks.
- Show scroll percentage inside a back-to-top control only when the compact value remains readable.

### Context and personalization menus

- Treat a custom context menu as a shortcut layer over existing commands, not as the only entry point.
- Group commands by scope: history, site navigation, page utilities, appearance, and media. Separate destructive actions and use confirmation for irreversible effects.
- Position within the viewport and adapt transform origin near viewport edges.
- Build settings around intent: reading, wallpaper, page composition, and secondary information. Pair every setting with immediate preview, persistence, and reset.
- Preserve the native context menu in inputs, editable content, selected text, and embedded controls unless the product requirement explicitly overrides it.

### Search

- Keep search input, clear action, filter action, results, loading, empty, error, and keyboard states explicit.
- Use a real `<form>`/`<input>` and labels. Reserve icon space in padding; keep decorative animated borders non-interactive.
- For a modal search, use a scrim, a bounded panel, a focus trap, Escape close, result count/status announcements, and focus restoration.
- Debounce expensive indexing/query work without delaying immediate input feedback. Cap visible results and show title/snippet context.
- Add fuzzy matching only when ranking remains predictable and visible to the user.
- Provide a static border/box-shadow fallback for animated conic-gradient or shader treatments.

### Cards and material effects

- Use fixed dimensions or aspect ratios for flip cards, post cards, feature cards, and active states.
- For compact multi-view cards, separate a fixed content viewport from a stable bottom state bar. Give every panel the same track width and switch panels with bounded transform/opacity motion rather than changing shell dimensions.
- Keep selected-tab changes inside reserved icon/label geometry so scaling or fading cannot resize the bar. Make inactive clipped panels `inert` or remove them from the tab order, and expose the active state with semantic tabs or equivalent ARIA.
- Prefer an opaque, lightly elevated surface over uncontrolled artwork. Preserve a usable minimum card width on narrow screens instead of shrinking text and controls below touch-friendly dimensions.
- Keep essential content on the visible face. Pair hover with focus and tap activation for reveals.
- For foil/shine cards, normalize one pointer vector and derive tilt, glare, shine, and texture offsets from it.
- Cap rotation, scale, blur, texture resolution, and compositing. Promote only the active card to expensive layers.
- Use `mix-blend-mode`, masks, and multiple gradients only when a flat fallback and contrast check exist.

### Glass surfaces and draggable decorative layers

- Define glass with semantic tokens for surface alpha, border alpha, blur radius, shadow, radius, text contrast, and a solid fallback. Verify text and focus contrast against the actual wallpaper; increase opacity or remove blur when the check fails.
- Keep wallpaper, glass cards, and content controls in separate layers. Provide a user-controlled wallpaper/transparency off state, and never let a moving background carry essential information.
- If a page includes a draggable or zoomable character/canvas, isolate it in a bounded decorative layer. Support mouse drag, touch/pointer gestures, and an accessible keyboard/button path for zoom in, zoom out, and reset. Clamp translation and scale, preserve text selection/scroll/link behavior, and use `grab`/`grabbing` only for the draggable surface.
- Pause or simplify canvas/model motion when hidden, off-screen, low-power, or under `prefers-reduced-motion`; cap DPR and clean up listeners/animation frames. Supply a static DOM/image placeholder when canvas or model loading fails.

### Galleries and image previews

- For a curated desktop photo wall, define explicit tracks, gaps, row ratios, and editorial spans. Reserve aspect ratios and lazy-load non-critical images.
- On narrow screens, replace a dense collage with a horizontal snap gallery or a simple one-column grid. Keep a visible continuation cue and stable touch-sized cards.
- Use semantic buttons for images that open previews. Pair hover zoom with focus-visible and tap behavior; never hide the only affordance behind hover.
- Open large images in a named dialog with contained media, descriptive text, close/Escape behavior, scroll locking, focus containment, and focus restoration.

### Media and dynamic backgrounds

- Treat music players as stateful controls: title, artist, cover, progress, elapsed/duration, play/pause, previous/next, repeat, volume, queue, and playback status.
- Make volume and queue controls keyboard/touch reachable; never make them hover-only.
- Stop equalizer and decorative motion when paused, hidden, or under reduced motion.
- Treat WebGL/shader/canvas backgrounds as optional and choose at most one primary full-screen canvas effect. Parameterize palette, speed, rotation, interaction, and quality; pause off-screen and on hidden documents; cap DPR; lower mobile quality; handle context loss; clean up animation frames and listeners.
- Provide a static image, gradient, or solid-color fallback that preserves content contrast.

### Reveals, ambient motion, and cursors

- Implement viewport reveals with `IntersectionObserver` and one explicit revealed state. Unobserve completed elements; show content immediately without JavaScript and under reduced motion.
- Give continuous logo, avatar, border, halo, equalizer, and canvas animation one shared budget. Default to at most one persistent identity effect and stop hidden/off-screen work.
- Apply bitmap cursors only under `@media (pointer: fine)` with `auto`/`pointer` fallbacks. Preserve text, resize, disabled, grab, and drag cursor semantics; never require a custom cursor to understand state.
- Transition only properties that explain state. Avoid `transition: all`, especially on panels with blur, canvas, images, or many descendants.

### Carousels

- Share one real index model across drag, buttons, keyboard, autoplay, and indicators.
- Use stable stage/card dimensions and reserve indicator space.
- Pause autoplay on hover, focus, document visibility loss, and reduced motion.
- Keep cloned loop slides internal; announce real slide numbers and label every control.
- Use perspective to clarify depth without hiding card content. Provide a non-3D transition fallback.

### Typography and content

- Choose readable body fonts and reserve expressive fonts for headings or short labels.
- Test real glyph metrics, fallback order, `lang`, `font-synthesis`, baseline, letter spacing, line height, `text-wrap`, and `text-size-adjust` together.
- Build pixel typography with a real pixel-outline font; `image-rendering: pixelated` affects raster images and does not pixelate text.
- Declare explicit `@font-face` weight/style/format and `font-display`; prefer licensed self-hosted WOFF2, preload only an above-the-fold face, and keep a metrically compatible fallback.
- Inspect actual cmap coverage and advance widths before claiming CJK support or monospace behavior. Test Latin, Han, full-width punctuation, symbols, bold/italic requests, and the font-loading state; mixed 600-unit Latin and 1000-unit Han glyphs are not one shared character grid.
- Render outline pixel fonts near their intended grid or integer multiples, keep letter spacing at `0`, use an explicit line height, and disable synthetic bold/italic. Do not use smoothing hacks to compensate for a poor face or size.
- Scope expressive pixel faces to headings, labels, navigation, dialogue, or short game/manual copy by default. Use them for long body text only after mobile, zoom, and mixed-language readability checks.
- Keep code blocks useful: language label, copy action, intentional wrapping/scrolling, and keyboard focus.
- Preserve the article's information hierarchy: title, metadata, summary, content, related items, comments, and navigation.
- Avoid continuous particles, audio characters, rotating notices, and decorative motion that compete with long-form reading.

## Accessibility and performance

- Prefer semantic elements and native controls. Use ARIA to describe state, not to replace missing semantics.
- Keep a visible focus indicator with sufficient contrast and a minimum effective pointer target near 44px for touch controls.
- Test keyboard traversal, Escape behavior, focus restoration, screen-reader names/status text, zoom, forced colors, and text-only fallbacks.
- Implement `@media (prefers-reduced-motion: reduce)` for every reveal, carousel, theme transition, shader, parallax, and equalizer effect.
- Avoid `transition: all`; transition only properties that communicate state. Suspend expensive descendants during theme transitions.
- Lazy-load non-critical images, use `content-visibility` only when intrinsic size is reserved, and clean up observers/listeners/animation frames on unmount.
- Keep interaction layers from blocking underlying content and verify pointer-events at every overlay level.

## Verification checklist

1. Render the changed page at narrow mobile, regular desktop, and wide desktop widths.
2. Test empty, loading, error, disabled, active, focused, hover, selected, expanded, collapsed, and reduced-motion states.
3. Verify no text overflow, layout shift, clipped controls, accidental horizontal scroll, or overlay collision.
4. Verify light/dark/system and compact theme resolution before first paint and after system preference changes.
5. Verify keyboard and touch interaction for menus, search, cards, rails, carousels, media, forms, tables, overlays, and settings.
6. Verify locale changes, long translated labels, RTL layout, popup placement, and the complete z-index ladder.
7. Verify expensive effects have cleanup and a static fallback; inspect the console for runtime errors.
8. Re-check licenses and attribution before reusing any third-party implementation, font, or asset.

## Reference map

Load `references/frontend-style-distillation-sources.md` for the complete evidence log covering all collected sources: floating rails, FF7 UI, Clarity, Anheyu, Haku76's theme, Imsyy, Bikari Archive, Dogument's pixel typography, Gaoice's Windows-style desktop UI, Lunora's dashboard sidebar, xlrt.top's compact multi-view card, Soki's directed photo wall, CRWeb's immersive profile archive, Uiverse cards/search/context/player, React Bits Balatro/carousel, Pokemon card materials, Blue Archive, Mizuki, Sakurairo, Ant Design, daisyUI, Ant Design Vue, Nord Termite, 7.css, and Home Assistant Mobile First. Use the platform label and the relevant section only; do not load the entire reference for an unrelated task.

## Skill maintenance SOP

After changing this skill:

1. Run `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` from the skill root.
2. Let the script test `import yaml` in the selected Python runtime and automatically install `PyYAML>=6,<7` into that same runtime when it is missing.
3. Run Skill Creator's `quick_validate.py` only after the dependency check succeeds. Treat installation or validation failure as blocking; do not report the skill as validated.
