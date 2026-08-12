---
name: web-frontend-style
description: Framework-neutral Web frontend design and implementation guidance for building or refining websites and interactive UI with semantic HTML, CSS, JavaScript, responsive layouts, accessible interactions, and deliberate visual systems. Use when Codex needs to design a new Web page, restyle an existing frontend, implement navigation, search, menus, cards, media, backgrounds, theme controls, or translate a visual reference into production-ready UI.
---

# Web Frontend Style

Use this skill to turn a visual direction into a coherent, usable Web interface. Preserve the repository's existing framework and content model; express the design in semantic HTML, CSS, and JavaScript first, then adapt the implementation to Vue, React, Astro, VitePress, WordPress, or another local stack.

Read `references/frontend-style-distillation-sources.md` when a task cites one of the collected references, asks for a named visual recipe, or needs source attribution and license boundaries. Use it as evidence and pattern guidance, never as permission to copy source code, fonts, characters, logos, images, textures, or audio.

## Workflow

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
- **Glass/wallpaper**: opaque text and controls over a controlled image, low-alpha borders, blur only where contrast is verified, independent wallpaper/card-transparency modes.
- **Immersive cover**: image/video or shader establishes identity, then a readable gradient/overlay introduces the first content hint.
- **Material card**: base art plus mask, texture, shine, glare, and a bounded pointer-driven tilt; provide a flat fallback.

Do not combine several dominant recipes merely because each looks attractive. Use the reference document to select compatible patterns and record the choice in the implementation plan.

### 3. Establish tokens

Define tokens before component CSS. At minimum provide:

- semantic surfaces: page, panel, elevated panel, transparent panel, scrim;
- text roles: primary, secondary, muted, inverse, link, selected;
- accents: brand, hover, active, focus, success, warning, danger;
- geometry: control size, radius, border width, spacing scale, content width, reading width, safe-area inset;
- motion: duration, easing, spring values where needed, and a reduced-motion mode;
- effects: shadow, blur, texture opacity, image brightness, and overlay opacity.

Use one hue or palette family only when contrast remains valid for every semantic role. Keep warning, danger, and content-image colors independent. Prefer `color-scheme` and a resolved `light`/`dark` DOM state; avoid duplicated `auto` branches.

### 4. Build stable structure

- Keep primary navigation and the main task visible at all times.
- Bound prose with a readable `max-width`; expand side rails only at deliberately wide breakpoints.
- Reserve space for dynamic titles, metadata, indicators, icons, and controls so state changes do not shift surrounding content.
- Use CSS grid/flex and stable `aspect-ratio`, `minmax`, `clamp`, or fixed tracks for cards, rails, carousels, toolbars, and post rows.
- Distinguish art-directed collage from masonry. Use explicit Grid spans for intentional compositions; use masonry only when arbitrary, content-driven heights justify it.
- Collapse or reorder secondary widgets on narrow screens instead of shrinking every element until it becomes unusable.
- For profile/archive pages, follow an identity stage with a bounded main-plus-profile shell. Define mobile source/order intentionally; do not let CSS reversal create a confusing reading or focus sequence.
- Protect `env(safe-area-inset-*)` and avoid collisions between floating rails, chat buttons, consent actions, and browser UI.

## Component Patterns

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
4. Verify light/dark/system theme resolution before first paint and after system preference changes.
5. Verify keyboard and touch interaction for menus, search, cards, rails, carousels, media, and settings.
6. Verify expensive effects have cleanup and a static fallback; inspect the console for runtime errors.
7. Re-check licenses and attribution before reusing any third-party implementation, font, or asset.

## Reference map

Load `references/frontend-style-distillation-sources.md` for the complete evidence log covering all collected sources: floating rails, FF7 UI, Clarity, Anheyu, Haku76's theme, Imsyy, Bikari Archive, Dogument's pixel typography, Gaoice's Windows-style desktop UI, Lunora's dashboard sidebar, xlrt.top's compact multi-view card, Soki's directed photo wall, CRWeb's immersive profile archive, Uiverse cards/search/context/player, React Bits Balatro/carousel, Pokemon card materials, Blue Archive, Mizuki, and Sakurairo. Use the relevant section only; do not load the entire reference for an unrelated task.

## Skill maintenance SOP

After changing this skill:

1. Run `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` from the skill root.
2. Let the script test `import yaml` in the selected Python runtime and automatically install `PyYAML>=6,<7` into that same runtime when it is missing.
3. Run Skill Creator's `quick_validate.py` only after the dependency check succeeds. Treat installation or validation failure as blocking; do not report the skill as validated.
