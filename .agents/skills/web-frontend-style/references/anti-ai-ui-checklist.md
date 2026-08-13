# Anti-AI UI Review

Use this reference before and after implementation. It targets recurring signs of
generic generated UI: average hierarchy, excessive cards, decorative gradients,
meaningless copy, tiny type, and animations that do not explain state.

## 1. Structure audit

- Can the primary task be named in one sentence?
- Does it occupy the largest continuous region?
- Are independent objects cards while ordinary sections remain unframed?
- Has any card been placed inside another card? Replace the inner card with an
  inset group, list, divider, tabs, or plain layout.
- Are all modules suspiciously equal in width, height, radius, and emphasis?
  Reallocate space according to importance and content shape.
- Does mobile reorder tasks intentionally, or merely stack desktop cards?
- Does a sidebar, floating rail, sticky footer, or overlay cover clickable content?

## 2. Typography audit

- Is default product body text `16px`, or is a smaller size justified by genuine
  workspace density?
- Are controls at least `15px` standard or `14px` compact?
- Are metadata and hints at least `13px`?
- Are page titles appropriately sized for the surface, without hero-scale type in
  a work panel?
- Does line height support Chinese and mixed-language reading?
- Are there more than seven visible size roles on one page? Consolidate them.
- Is an expressive font being used for long body copy without readability proof?

## 3. Shape and component audit

- Do normal controls follow the rounded HakuStyle baseline?
- Are square corners limited to an explicit retro/window recipe?
- Are radii proportional across nested elements?
- Are pills used only for filters, statuses, segmented choices, or short tags?
- Does every component have hover, focus-visible, active, disabled, loading, and
  error/selected states where relevant?
- Are hit targets at least `44px` on touch surfaces?
- Does loading preserve label width and component geometry?

## 4. Surface and color audit

- Are primary content surfaces opaque or sufficiently high-opacity?
- Is blur being used to solve contrast that should be solved with a stronger fill?
- Is the border neutral and quieter than the text in the default state?
- Are border and text using the same saturated accent without selected, focus,
  warning, or error meaning?
- Has every card been outlined despite whitespace or elevation already separating it?
- Is a large purple/blue gradient standing in for actual hierarchy?
- Are success, warning, and danger still semantically distinct from the brand?

## 5. Decoration audit

Delete or justify every:

- isolated circular dot, orb, bubble, bokeh mark, or floating blob;
- glow, halo, animated border, and gradient edge;
- badge, chip, eyebrow, status capsule, and tiny label;
- glass surface and wallpaper effect;
- reveal animation, parallax, continuous breathing, or canvas layer.

Keep an item only if it encodes state, supports navigation, establishes the single
chosen identity effect, or materially improves comprehension.

Carousel pagination dots are allowed because they encode position. Online/unread
dots are allowed because they encode state. Random dots near headings are not.

## 6. Copy audit

- Remove generic lines such as "Explore possibilities", "Everything you need",
  "Welcome back", or explanatory marketing text when real task content exists.
- Use domain data, actual labels, actual errors, and realistic empty states.
- Do not write visible instructions that merely describe obvious controls or visual
  features.
- Button labels should name commands. Tooltips should clarify unfamiliar icons.
- Do not add a subtitle to every title merely to fill space.

## 7. Motion audit

- Does every animation explain entrance, continuity, selection, loading, success,
  error, or manipulation?
- Are non-interactive cards lifting on hover? Remove the lift.
- Are all sections fading upward on first load? Keep only meaningful grouped reveal.
- Is `transition: all` present? Replace it with specific properties.
- Is there more than one persistent identity animation?
- Are reduced-motion, hidden-page pause, cleanup, and static fallback implemented?

## 8. State audit

Demo and production UI must include realistic states rather than pristine default
cards only:

- loading and slow loading;
- empty with a useful next action;
- validation error and server error;
- disabled and permission-limited;
- long text and large numbers;
- selected, expanded, collapsed, and partial progress;
- light, dark, and system theme resolution;
- narrow mobile and 1280px laptop layouts.

## 9. Subtraction tests

Run these before accepting a design:

1. Remove 30% of decorative layers. Did hierarchy improve? Keep them removed.
2. Turn off color. Can spacing, size, and grouping still explain the page?
3. Turn off animation. Can the workflow still be completed and state understood?
4. Replace wallpaper with a plain surface. Does text remain readable and grouping
   remain clear?
5. Replace every card with an unframed section mentally. Which objects truly need
   individual boundaries?
6. Read only headings and action labels. Do they describe the real workflow?

## 10. Acceptance gate

Do not call the UI polished until:

- the selected page archetype, density, theme, and signature effect are explicit;
- primary text and controls meet the HakuStyle size baseline;
- rounded geometry is coherent;
- borders, transparency, decoration, and animation pass the semantic tests;
- keyboard, touch, focus, loading, error, narrow, dark, and reduced-motion states
  have been verified;
- the page still feels intentional after decoration is disabled.
