# HakuStyle Core Palette System

This is the current HakuStyle palette decision. It is based on the palette review
with Hakuhiro and is intentionally expressed as semantic tokens rather than a
single fixed skin.

## Decision

Use **Ant Neutral** as the default HakuStyle direction. Hakuhiro's stated
preference is cool, clean, and comparatively neutral. Ant Neutral has the broadest fit
for Web products, dashboards, tools, PokeHero-style data views, and mixed desktop
and mobile workflows. Keep the surfaces neutral and let blue carry actions; use
violet only for secondary identity, not as a second primary action system.

The final preferred shortlist from the three-round review is **Indigo Night**,
**Frosted Lilac**, and **Royal Blueprint**. These are the first alternatives to
offer when a task is open-ended and the user wants a distinct identity without
leaving the cool/clean/neutral family.

Keep the previously approved scene variants:

- **HakuDex Azure**: a JRPG / Pokemon archive variant. Use deep blue surfaces,
  cyan actions, and warm gold for rarity or important milestones. It is more
  expressive and should be selected when the product identity needs to be felt.
- **Sakura Mist**: a blog / reading variant. Use warm light surfaces, pink as
  the primary action, and periwinkle for links or secondary navigation. Keep
  decoration quiet so long-form text remains dominant.
- **Blue Archive Dual**: a blog / documentation variant with two deliberately
  different modes. Day uses mist blue and clear azure; night uses near-black
  violet surfaces and restrained lavender emphasis.

`Silver Lilac` remains an experimental/secondary option only. It was acceptable
but not a first-choice direction.

Do not activate all three directions on one page. Choose one palette family per
product surface. A shared component library may expose all three as theme scopes,
but each route should have one active family.

## Selection rules

1. Start with Ant Neutral unless the user names a different direction or the
   product identity clearly requires one.
2. Offer Indigo Night for a low-noise dark archive, developer tool, or desktop
   workbench that needs stronger depth than Ant Neutral.
3. Offer Frosted Lilac for a personal creative tool or portfolio that needs a
   cool, soft identity without pink or warm decoration.
4. Offer Royal Blueprint for a collection, archive, catalog, or desktop-first
   Web product where structure and information hierarchy should be prominent.
5. Choose HakuDex Azure for a game archive, collection, JRPG profile, PokeHero
   surface, or a deliberately game-like desktop Web experience.
6. Choose Sakura Mist for a personal blog, documentation site, article reader,
   or calm portfolio where reading time is the primary task.
7. Choose Blue Archive Dual when a blog or documentation site should feel cool,
   clean, youthful, and more thematic than Ant Neutral without becoming ornate.
8. For mobile control panels, retain Ant Neutral's semantic and contrast rules;
   use Noctis-style dark neutrals only when the user explicitly wants a dark
   control-room mood. Do not transfer desktop density to touch layouts.
9. If a user asks for a source reference but not a complete theme, borrow its
   component behavior and keep the selected core palette unchanged.

## Three-round review summary

| Round | Candidates shown                                                                     | Result                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | HakuDex Azure, Nord Aurora, Sakura Mist, Noctis Mobile, Ant Neutral                  | Liked HakuDex Azure, Sakura Mist, and Ant Neutral; preferred Ant Neutral over HakuDex Azure.                                                                  |
| 2     | Blue Archive Dual, Glacier Teal, Cobalt Ink, Silver Lilac, plus the existing lab set | Liked Blue Archive Dual; rejected the green-led Glacier Teal; found Silver Lilac acceptable but not decisive; rejected the foggy Nord feel and Noctis Mobile. |
| 3     | Arctic Slate, Cerulean Paper, Indigo Night, Frosted Lilac, Royal Blueprint           | Selected Indigo Night, Frosted Lilac, and Royal Blueprint; passed Arctic Slate and Cerulean Paper.                                                            |

The distilled preference is: crisp neutral surfaces, cool blue/indigo/lilac
identity colors, restrained saturation, readable contrast, and no green-led brand
palette or foggy gray wash. Do not present rejected candidates again unless the
user explicitly asks to revisit them.

## Confirmed exclusions

The current review also establishes these negative preferences:

- Do not make green or teal-green the dominant brand hue. Small success/status
  greens remain allowed as semantic colors.
- Do not use a foggy, low-contrast gray wash as the main visual identity. Keep
  neutral surfaces crisp and give the primary action enough chroma to read.
- Do not use Noctis Mobile as a default direction; its dark control-console mood
  is not part of Hakuhiro's preferred palette family.
- Do not prioritize Nord Aurora; its muted fog-like contrast is not preferred.
- Do not prioritize Arctic Slate or Cerulean Paper; both were passed in the final
  round.
- Do not repeat a rejected candidate in a later palette review unless the user
  explicitly asks to revisit it.

## Shared semantic contract

Use these names in CSS, design-token files, or the selected component library:

```css
:root {
  --hs-page: ...;
  --hs-surface: ...;
  --hs-surface-elevated: ...;
  --hs-text: ...;
  --hs-text-secondary: ...;
  --hs-text-muted: ...;
  --hs-border: ...;
  --hs-brand: ...;
  --hs-brand-hover: ...;
  --hs-brand-content: ...;
  --hs-accent: ...;
  --hs-accent-content: ...;
  --hs-link: ...;
  --hs-focus: ...;
  --hs-success: ...;
  --hs-warning: ...;
  --hs-danger: ...;
}
```

Every filled semantic token needs a readable content pair. Status meaning must
also be expressed with text, icon, shape, or a border; never rely on hue alone.
Keep the token names stable when adapting to Ant Design, Ant Design Vue, daisyUI,
Tailwind, Vue, React, or plain CSS.

## Ant Neutral tokens

### Light

| Token                   | Value     | Use                                   |
| ----------------------- | --------- | ------------------------------------- |
| `--hs-page`             | `#F5F7FA` | application background                |
| `--hs-surface`          | `#FFFFFF` | cards, forms, popovers                |
| `--hs-surface-elevated` | `#EDF2F7` | hover, selected, raised regions       |
| `--hs-text`             | `#182230` | primary text                          |
| `--hs-text-secondary`   | `#475467` | secondary labels                      |
| `--hs-text-muted`       | `#667085` | supporting metadata                   |
| `--hs-border`           | `#D9E0EA` | separators and control borders        |
| `--hs-brand`            | `#1677FF` | primary actions and links             |
| `--hs-brand-hover`      | `#0958D9` | hover/pressed brand state             |
| `--hs-brand-content`    | `#FFFFFF` | text on brand                         |
| `--hs-accent`           | `#7B61FF` | secondary identity or selected marker |
| `--hs-accent-content`   | `#FFFFFF` | text on accent                        |
| `--hs-success`          | `#237B4B` | success                               |
| `--hs-warning`          | `#9A6700` | warning                               |
| `--hs-danger`           | `#C9364B` | error/destructive                     |
| `--hs-focus`            | `#1677FF` | focus ring                            |

### Dark

| Token                   | Value     | Use                                   |
| ----------------------- | --------- | ------------------------------------- |
| `--hs-page`             | `#151B25` | application background                |
| `--hs-surface`          | `#202938` | cards, forms, popovers                |
| `--hs-surface-elevated` | `#2B3749` | hover, selected, raised regions       |
| `--hs-text`             | `#F1F5F9` | primary text                          |
| `--hs-text-secondary`   | `#CBD5E1` | secondary labels                      |
| `--hs-text-muted`       | `#A9B4C2` | supporting metadata                   |
| `--hs-border`           | `#465367` | separators and control borders        |
| `--hs-brand`            | `#69A7FF` | primary actions and links             |
| `--hs-brand-hover`      | `#91BEFF` | hover/pressed brand state             |
| `--hs-brand-content`    | `#10213D` | text on brand                         |
| `--hs-accent`           | `#A99BFF` | secondary identity or selected marker |
| `--hs-accent-content`   | `#21194A` | text on accent                        |
| `--hs-success`          | `#78C596` | success                               |
| `--hs-warning`          | `#F2C66D` | warning                               |
| `--hs-danger`           | `#FF8795` | error/destructive                     |
| `--hs-focus`            | `#91BEFF` | focus ring                            |

## HakuDex Azure variant

Use Ant Neutral's semantic names, but replace the neutral and identity seed with:

| Token                   | Light     | Dark      |
| ----------------------- | --------- | --------- |
| `--hs-page`             | `#F2F6FB` | `#101A33` |
| `--hs-surface`          | `#FFFFFF` | `#192849` |
| `--hs-surface-elevated` | `#E5EEF8` | `#25456E` |
| `--hs-text`             | `#17243A` | `#EDF5FF` |
| `--hs-brand`            | `#1687B5` | `#55C7E8` |
| `--hs-brand-hover`      | `#0D668D` | `#88DDF2` |
| `--hs-brand-content`    | `#FFFFFF` | `#092238` |
| `--hs-accent`           | `#C88A1A` | `#FFCB69` |
| `--hs-accent-content`   | `#2A1A04` | `#352100` |
| `--hs-link`             | `#1769AA` | `#8CCDF0` |

Reserve gold for rarity, rewards, featured records, or important milestones. It
must not become the default button color across the interface.

## Sakura Mist variant

Use Ant Neutral's semantic names, but replace the neutral and identity seed with:

| Token                   | Light     | Dark      |
| ----------------------- | --------- | --------- |
| `--hs-page`             | `#F2F1F6` | `#241C2B` |
| `--hs-surface`          | `#FFFFFF` | `#302438` |
| `--hs-surface-elevated` | `#EEEAF3` | `#3E2D47` |
| `--hs-text`             | `#292D3B` | `#FFF4FB` |
| `--hs-text-muted`       | `#6F7586` | `#CBB6C6` |
| `--hs-brand`            | `#CF719C` | `#E89BBE` |
| `--hs-brand-hover`      | `#B85B87` | `#F0B2CC` |
| `--hs-brand-content`    | `#FFFFFF` | `#3A1728` |
| `--hs-accent`           | `#6F91C6` | `#9DB8EA` |
| `--hs-accent-content`   | `#FFFFFF` | `#17233D` |
| `--hs-link`             | `#5676AE` | `#AFC7F2` |

## Blue Archive Dual variant

This mapping is distilled from the repository's `vars.less`. Preserve the
light-blue / dark-violet mode change instead of forcing both modes into blue.

| Token                   | Day       | Violet night |
| ----------------------- | --------- | ------------ |
| `--hs-page`             | `#EAEFF5` | `#0F0F16`    |
| `--hs-surface`          | `#FFFFFF` | `#1F1F2C`    |
| `--hs-surface-elevated` | `#EFF2F4` | `#2A2A3A`    |
| `--hs-text`             | `#263444` | `#F0EDF7`    |
| `--hs-text-muted`       | `#4C5866` | `#C8C8DC`    |
| `--hs-brand`            | `#128AFA` | `#9D7CD8`    |
| `--hs-brand-hover`      | `#0B6FCB` | `#B09AE3`    |
| `--hs-brand-content`    | `#FFFFFF` | `#20162F`    |
| `--hs-accent`           | `#466398` | `#705781`    |
| `--hs-border`           | `#D5D9DB` | `#383852`    |

The upstream bright yellow is a decorative/game accent. In HakuStyle, reserve
yellow for a tiny badge, featured marker, or reward. Do not use it for normal
text on white. Keep the upstream 300ms theme transition only for color,
background, border, shadow, and opacity; do not transition layout properties.

## Final preferred variants

These three variants are the result of the final round. Their names are HakuStyle
labels, not claims about the source projects from which the ideas were distilled.

### Indigo Night

Use for a low-noise dark archive, developer tool, or desktop workbench.

| Token                   | Light     | Dark      |
| ----------------------- | --------- | --------- |
| `--hs-page`             | `#F3F4FA` | `#12162A` |
| `--hs-surface`          | `#FFFFFF` | `#1E2540` |
| `--hs-surface-elevated` | `#E8EAF5` | `#2B3557` |
| `--hs-text`             | `#20243A` | `#F0F2FF` |
| `--hs-text-muted`       | `#6B7086` | `#ADB5D3` |
| `--hs-brand`            | `#5365D8` | `#8494FF` |
| `--hs-brand-hover`      | `#4153C1` | `#A3AFFF` |
| `--hs-brand-content`    | `#FFFFFF` | `#151A3A` |
| `--hs-accent`           | `#8A80CF` | `#B4A5F2` |
| `--hs-border`           | `#D9DBEA` | `#46547C` |

### Frosted Lilac

Use for a cool, soft personal identity without pink-led or warm decoration.

| Token                   | Light     | Dark      |
| ----------------------- | --------- | --------- |
| `--hs-page`             | `#F4F3F8` | `#1A1926` |
| `--hs-surface`          | `#FFFFFF` | `#252334` |
| `--hs-surface-elevated` | `#EBE9F2` | `#332F46` |
| `--hs-text`             | `#272938` | `#F4F1FA` |
| `--hs-text-muted`       | `#6D7080` | `#BBB5C9` |
| `--hs-brand`            | `#7769BD` | `#AFA0EA` |
| `--hs-brand-hover`      | `#6355A7` | `#C0B3F2` |
| `--hs-brand-content`    | `#FFFFFF` | `#241C3A` |
| `--hs-accent`           | `#5D86B2` | `#91B5DB` |
| `--hs-border`           | `#DCDBE5` | `#514A68` |

### Royal Blueprint

Use for collections, catalogs, archives, or desktop-first Web products where
structure and information hierarchy should be prominent.

| Token                   | Light     | Dark      |
| ----------------------- | --------- | --------- |
| `--hs-page`             | `#EEF2F7` | `#0F1C35` |
| `--hs-surface`          | `#FFFFFF` | `#192A4A` |
| `--hs-surface-elevated` | `#E1E8F2` | `#27406C` |
| `--hs-text`             | `#14233D` | `#EFF5FF` |
| `--hs-text-muted`       | `#5E6D83` | `#A9BAD4` |
| `--hs-brand`            | `#2452A4` | `#7BA7F1` |
| `--hs-brand-hover`      | `#1B4087` | `#9ABBF6` |
| `--hs-brand-content`    | `#FFFFFF` | `#102344` |
| `--hs-accent`           | `#7296D8` | `#B2C7EE` |
| `--hs-border`           | `#CBD6E5` | `#425A82` |

## Implementation and verification

- Resolve `light`/`dark` explicitly on the theme root and use `color-scheme`.
- Derive hover, active, disabled, selected, and focus states from semantic tokens;
  do not scatter literal hex values through component CSS.
- Check normal text at 4.5:1, large text at 3:1, and focus indicators at 3:1
  against the actual surface. Recheck status colors on both modes.
- Keep the page background and surfaces neutral enough that images, cards, and
  source-specific effects remain legible.
- Store theme choice in the product's existing preference mechanism only when the
  product already has one; otherwise prefer system mode plus an explicit toggle.
- Test the selected palette at 320px, 360px, 736px, and wide desktop. A palette
  decision must not introduce overflow, unreadable controls, or motion dependence.
