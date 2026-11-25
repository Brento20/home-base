# Home Base · Icons v3

118 symbols plus 13 filled selected-state variants, redrawn to sit comfortably next to Apple's system UI. They're original drawings and are not SF Symbols. File names, folder paths and sprite IDs are the same as v2, so you can drop them in as a replacement.

## System

- **Grid:** 24 × 24 viewBox with a 2 px safe margin (20 px live area).
- **Stroke:** a single 1.5 weight across the whole set, with round caps and joins. v2 mixed 1.65 and 1.8.
- **Keylines:** circle r 9, square 16.5 (r 4.25), portrait 15 × 17 (r 3), landscape 17–18 × 13 (r 2.5–2.75). Icons built on the same keyline share one silhouette, for example calendar, task, dice and the selected states.
- **Detail dots:** solid, r 1–1.25. They're used only where they help recognition, such as calendar days, dice pips and the more menu.
- **Selected states (`-fill`):** these match the outline's outer edge exactly. Inner details are true cut-outs (even-odd paths) rather than overlays, so they work on any background. You can swap outline and fill without any layout shift.
- **Colour:** `currentColor` everywhere, on a transparent background.

## Use

```html
<svg width="24" height="24" aria-hidden="true"><use href="/icons/sprite.svg#home" /></svg>
<svg width="24" height="24" aria-hidden="true"><use href="/icons/sprite.svg#home-fill" /></svg>
```

The icons inherit text colour only when they're inline or used through the sprite. An SVG loaded with `<img>` won't pick up the text colour.

Open `index.html` to search the set, switch between light and dark, change the preview size and copy an icon as raw SVG or as a `<use>` snippet.

## Changes made in home base

- `gaming-entertainment/switch-controller.svg` was still drawn at the old 1.65 stroke, with the right controller filled solid. It's redrawn as a mirror of the left at 1.5, with the same r 1.25 detail dots as the rest of the set, so it carries the same weight as everything around it.
- `tools/make_icons.py` turns this folder into `src/lib/icons/glyphs.ts`. What each icon means lives in `src/lib/icons/registry.ts`.
