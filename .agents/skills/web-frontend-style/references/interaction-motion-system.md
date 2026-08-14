# Interaction and Motion System

Use this reference whenever the UI accepts input, changes state, opens an overlay,
switches theme, reveals content, drags media, or runs persistent animation. Motion
must explain cause, continuity, or status. Smoothness comes from predictable state
and stable geometry, not from animating every element.

## 1. Universal action sequence

Model an operation as:

```text
available -> hover/focus -> pressed -> pending
          -> success | warning | error
          -> continue | undo | retry
```

- Give local feedback immediately after input.
- Keep the pending state geometrically stable and prevent duplicate submission.
- Preserve user input and context after validation or server errors.
- Put feedback at the lightest level that can explain the consequence.
- Restore focus after menus, drawers, dialogs, previews, and command panels close.
- Offer undo for reversible destructive actions; confirm only when consequence and
  recovery justify interruption.

## 2. Timing tokens

| Event                 |    Duration | Typical properties                |
| --------------------- | ----------: | --------------------------------- |
| Press feedback        |  `80-120ms` | fill, scale to `0.98-0.99`        |
| Hover / focus styling | `120-180ms` | color, fill, border, shadow       |
| Control state         | `160-220ms` | indicator, selected fill, icon    |
| Menu / popover        | `160-220ms` | opacity, `4-8px` translate        |
| Tooltip               | `120-180ms` | opacity                           |
| Drawer / modal        | `220-300ms` | opacity, bounded translate/scale  |
| Content view switch   | `240-360ms` | opacity, bounded transform        |
| Theme transition      | `320-500ms` | color, background, border, shadow |
| Signature reveal      | `400-700ms` | one identity element only         |

Use a standard ease such as `cubic-bezier(.2, .8, .2, 1)` for entrances and a
faster ease-out for direct control feedback. Use springs for drag settling or card
physics, not for ordinary buttons and text.

## 3. Motion budget

- Allow at most one persistent identity animation in a normal viewport.
- Allow at most one expensive canvas, shader, foil, or blended material effect on
  a page, and activate expensive card material only for the focused/active object.
- Stagger at most five meaningful groups, around `24-40ms` apart. Do not stagger
  every paragraph, icon, and card.
- Use one reveal language per page. Do not combine fade-up, zoom, rotation, blur,
  and parallax on the same entrance.
- Limit hover lift to `1-2px` for product components and `2-4px` for expressive
  cards. Non-clickable cards do not lift.
- Never use `transition: all`.

## 4. Theme switching

Resolve `system` to light or dark before first paint and store the user's explicit
choice only through the product's preference mechanism.

State model:

```text
system preference ─┐
                   ├─> resolved light/dark -> semantic tokens -> components
user override ─────┘
```

- Transition only color, background-color, border-color, box-shadow, fill,
  stroke, and opacity.
- Do not transition width, height, layout, font metrics, or content order.
- A click-origin View Transition may be used for Haku76/Blue Archive-like thematic
  pages, but cap it around `500ms`, suspend costly descendants, and provide a plain
  token transition fallback.
- Keep focus, selection, status meaning, and component geometry unchanged across
  themes.

## 5. Menus and overlays

### Navigation, context, and overflow menus

- Open from the trigger edge and adapt transform origin near viewport boundaries.
- Keep the menu inside the viewport with at least `8px` edge clearance.
- Support Arrow keys, Home/End when appropriate, Enter/Space, Escape, outside
  click, and focus restoration.
- Preserve the native context menu in inputs, editable content, selections, and
  embedded controls.
- Group commands by scope; separate destructive actions.
- Give every context-menu command another normal entry point.

### Dialogs, drawers, and search panels

- Give the surface an accessible name, initial focus, focus containment, Escape
  behavior, close action, scroll locking, and focus restoration.
- Keep scrims visually quieter than the panel and block pointer interaction behind
  modal surfaces.
- Reserve layout for loading, empty, results, error, and retry states.
- Do not animate the entire page behind a dialog.

## 6. Search behavior

```text
idle -> typing -> local feedback -> debounced query
     -> loading -> results | no results | error
```

- Show typed text immediately; debounce only expensive indexing or requests.
- Provide clear, filters when meaningful, result count/status, highlighted context,
  and keyboard selection.
- Preserve the query after an error and expose retry.
- Keep fuzzy ranking understandable; do not show apparently random results merely
  to avoid an empty state.
- Animate a Uiverse-style border only during focus or an explicit themed state,
  and provide a static focus ring.

## 7. Sidebar behavior

```text
expanded <-> collapsed (desktop)
closed <-> drawer open (tablet/mobile)
```

- Transition desktop sidebar width together with the main grid track; fade and
  clip labels within a reserved label column.
- Keep icon position and row hit area stable.
- Disable pointer interaction on hidden labels during the transition.
- In drawer mode, use a scrim, lock document scroll, close on route selection when
  appropriate, and return focus to the menu trigger.
- Never let an invisible or translated sidebar remain above the main content with
  active pointer events.

## 8. Cards, tabs, and carousels

- Use one index/selection model for pointer, keyboard, buttons, drag, and indicators.
- Reserve dimensions for selected icons, labels, media, and status bars.
- Mark hidden panels `inert` or remove them from the tab order.
- Pause autoplay on hover, focus, document visibility loss, and reduced motion.
- For flip/reveal cards, keep essential information on the initial face and provide
  click/tap/keyboard activation.
- For Pokemon-style tilt, normalize a pointer vector, cap rotation and scale, and
  settle to neutral when input leaves or focus changes.

## 9. Drag, zoom, and decorative characters

- Use Pointer Events for mouse, pen, and touch.
- Start drag only from the actual draggable surface. Do not block page scroll,
  selection, links, or controls outside it.
- Clamp translation and scale; expose zoom in, zoom out, and reset controls for
  keyboard and non-pointer users.
- Change `grab` to `grabbing` only while the decorative layer owns the gesture.
- Stop drift, follow, breathing, and automatic movement under reduced motion.
- Use a static image/DOM placeholder when canvas or model loading fails.

## 10. Feedback details

- Use inline validation near the field for correctable input.
- Use transient messages for low-risk confirmation that does not require action.
- Use notifications for asynchronous results the user may need to revisit.
- Use popconfirm for a small, contextual irreversible action.
- Use a modal or full result state for consequential workflows.
- Use skeletons when structure is known, spinners for short unknown waits, and
  progress for measurable work.

Loading is not disabled styling. Expose busy state, keep contrast, reserve content,
and prevent duplicate actions.

## 11. Reduced motion

Under `prefers-reduced-motion: reduce`:

- Remove reveal translation, scaling, tilt, parallax, spring overshoot, smooth
  scrolling, autoplay, shader motion, foil tracking, breathing, and equalizers.
- Keep short color/opacity changes when they are necessary to communicate state.
- Show content immediately and keep current position/index/state legible.
- Do not replace motion with flashing.

## 12. Interaction verification

For every interactive component verify:

1. default, hover, active, focus-visible, selected, disabled, loading, success,
   warning, error, and empty states when applicable;
2. keyboard order, Escape, outside click, focus restoration, and screen-reader name;
3. touch target and gesture conflicts;
4. long labels, zoom, narrow viewport, and no-hover operation;
5. reduced motion, hidden document, component unmount, and cleanup;
6. stable geometry with no unexpected layout shift.
