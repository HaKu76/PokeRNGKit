# Web Layout Archetypes

Use this reference after classifying the product and primary task. Select one page
archetype as the structural foundation. A page can contain many components, but it
must not contain several competing shells.

## Shared layout rules

- Give the primary task the largest continuous region.
- Use page bands and whitespace for sections. Use cards only for independent
  records, tools, previews, summaries, or selectable objects.
- Do not put cards inside cards. Use headings, dividers, inset surfaces, lists, or
  field groups inside a card.
- Avoid equal-width, equal-height modules unless the content has equal importance.
- Keep common controls in predictable locations. Put rare controls in menus,
  drawers, contextual toolbars, or personalization panels.
- Reserve stable tracks for sidebars, headers, tab bars, media, and dynamic status.
- Recompose at narrow widths. Do not scale a desktop grid down proportionally.

## 1. Operational workspace

Use for dashboards, tools, archives, data entry, settings, and applications such
as PokeHero or PokeRNGKit.

```text
┌──────────── sidebar 240-272 ────────────┬──────────────────────────┐
│ brand / project switcher                │ top task toolbar 56-64  │
├─────────────────────────────────────────┼──────────────────────────┤
│ scrollable grouped navigation           │                          │
│                                         │ continuous main workspace│
│                                         │ max-width by task, not   │
│                                         │ arbitrary card wrapper   │
├─────────────────────────────────────────┤                          │
│ account / theme / help                  │                          │
└─────────────────────────────────────────┴──────────────────────────┘
```

- Use a `240-272px` expanded sidebar and `68-76px` collapsed rail.
- Use `44-48px` navigation rows, `10-12px` row radius, `15px` labels, and stable
  `20px` icon columns.
- Divide the sidebar into a fixed header, independently scrollable navigation, and
  bottom-pinned utilities. Do not let long navigation push account or theme
  controls off-screen.
- Make only the active group expanded when groups are long. Preserve route access
  when a label wraps or the rail collapses.
- Keep main content padding around `24-32px` desktop and `16-20px` narrow.
- Let dense tables or editors use the available width. Do not wrap the entire
  workspace in a decorative centered card.
- On tablets and phones, use a labelled drawer with scrim and focus management.
  Use bottom navigation only when there are three to five equally primary routes.

### Sidebar collision requirements

- Offset or grid-position main content by the actual sidebar width. Never overlay
  the expanded sidebar on clickable content without a scrim and modal drawer state.
- Synchronize sidebar width and content track in one state change.
- Keep the collapse button inside a stable hit area and away from nearby links.
- Tooltips in collapsed mode supplement labels; they must not be the only mobile
  navigation model.
- Verify keyboard focus, browser zoom, long Chinese labels, 1280px laptop width,
  and a tall navigation list.

## 2. Reading and documentation

Use for Clarity-, Mizuki-, Sakurairo-, Blue Archive-, or Haku76-derived blogs and
documentation.

- Keep the article reading column at `680-760px`.
- Add a left navigation or right table of contents only when the viewport can keep
  the reading column intact. Collapse secondary rails before shrinking prose.
- Use a compact site header around `60-72px`; transparent-over-cover headers must
  gain a readable solid/high-opacity surface on scroll and keyboard focus.
- Preserve title, metadata, summary, article, related navigation, and comments as a
  clear reading sequence.
- Use `32-48px` separation between major article sections rather than enclosing
  each section in a card.
- Keep code blocks, callouts, images, and tables as specific framed tools. Do not
  turn normal paragraphs into tiles.
- On narrow screens, use one reading column, `16-20px` inline padding, and a drawer
  or inline table of contents.

## 3. Personal archive / profile

Use for CRWeb, Hurt-in-dream, Haku76, xlrt, or game-archive identity pages.

- Start with an identity region that visibly establishes the person or project in
  the first viewport.
- Follow it with either a bounded main-plus-profile shell or an explicit Bento
  composition. Choose one.
- For Bento, use a `1040-1160px` container and explicit spans. Give the identity or
  primary collection item the largest span; status and utility tiles remain small.
- For main-plus-profile, target roughly `2fr / 1fr` with a `24px` gap, keeping the
  information rail narrower than the activity rail.
- Keep wallpapers, canvas, and decorative characters in separate layers from text
  and controls.
- Use stable aspect ratios for identity media. Do not let media determine the
  entire page height after loading.
- On phones, define a meaningful source order and use a single column. Identity,
  current status, and primary actions should precede decorative galleries.

## 4. Editorial gallery

Use for Soki-style curated photos, game screenshots, art, or collection showcases.

- Use explicit Grid spans when editors decide which items are important.
- Use ordinary responsive Grid or masonry only when arbitrary item heights and
  dynamic order justify it.
- Keep desktop gaps around `12-20px` and media radii around `16-20px`.
- Change interaction on narrow screens: a horizontal snap gallery with the next
  item partially visible is preferable to a crushed six-column collage.
- Open previews in a named dialog with description, close action, Escape, focus
  containment, focus restoration, and scroll locking.

## 5. Mobile control surface

Use for Home Assistant-like quick control, PWA/WebView, status monitoring, and
single-handed repeated actions.

- Order content as summary, current task group, actionable records, then secondary
  history or settings.
- Give each card one state and one common action. Open complex controls in a
  dedicated panel rather than filling every card with knobs and sliders.
- Use `48px` control targets and account for `env(safe-area-inset-bottom)`.
- Keep the bottom action bar stable without covering the final content item.
- Expand to more columns on tablets and desktops while preserving the phone source
  order and command model.
- Do not use hover-only reveals, tiny indicators, desktop sidebars, or free-floating
  windows as required interaction.

## 6. Desktop / JRPG window shell

Use only for explicitly game-like archives, retro desktop pages, or PC-first
personal experiences derived from FF7, 7.css, Gaoice, or Haku76.

- Keep window geometry stable and use a clear active-window state.
- Reserve title bars, selection gutters, status bars, and taskbar space.
- Use compact directional shadows, bevels, or pixel borders only inside the named
  shell scope.
- Keep modern semantic controls and keyboard behavior underneath the material.
- Replace free positioning with natural flow below the desktop breakpoint.
- Do not apply the window shell to long articles, mobile control pages, or every
  modal in an otherwise standard product.

## 7. Search and command surface

Search may appear in any archetype, but its layout must follow one of two modes:

- **Inline search:** full-width within a toolbar or content band, `44-48px` high,
  with clear, filter, loading, and results status nearby.
- **Search panel:** scrim plus a `min(90vw, 768px)` panel, `16-20px` radius,
  `48-56px` search header/control geometry, capped result list, and focus trap.

Do not make a glowing animated search input the only visible organization on a
quiet product page. Treat Uiverse glow as one optional focused-state material.

## 8. Floating utilities

- Keep the rail in the lower-right safe region with one stable primary column.
- Use `44px` hit targets even when a source uses `36-38px` visible buttons.
- Expand secondary commands laterally without reflowing the page.
- Keep one discoverable expand/collapse action.
- Avoid collision with consent prompts, chat, media controls, browser safe areas,
  and article content.
- On mobile, retain only genuinely frequent actions or move them into a bottom
  sheet/menu.

## Responsive verification matrix

Verify at least:

| Width         | Purpose                                             |
| ------------- | --------------------------------------------------- |
| `360-390px`   | phone, long labels, safe areas                      |
| `768px`       | tablet / shell transition                           |
| `1280px`      | common laptop, sidebar collision                    |
| `1440-1536px` | standard desktop composition                        |
| `1920px+`     | constrained content and intentional wide-screen use |

At each width, confirm that the primary task remains first, text does not shrink
below its selected profile, and secondary navigation changes architecture instead
of overlapping content.
