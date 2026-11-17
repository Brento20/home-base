# liquid-glass (vendored)

`liquid-glass.js` and `components.js` from [gentpan/liquidglass](https://github.com/gentpan/liquidglass)
(`skill/liquid-glass-web/assets`, v1.0.0), MIT licence (see `LICENSE`). Live docs: https://liquidglass.dev.

Copied unchanged except for one fix in `components.js`, marked `home base:`. The skill's own guidance
is to modify rather than rewrite the filter code, then re-verify in Chrome, Safari and Firefox,
because it encodes measured per-engine fixes.

**The fix (Safari):** a glass surface over a CSS-background backdrop used to hold a page-sized copy
of the backdrop, moved behind it with a transform. WebKit sizes an `objectBoundingBox` filter from
the element and its descendants (`overflow: hidden` doesn't change that), so every lens was
stretched to the size of the page: cards near the bottom or right of the screen were cut off with
a curled edge, and the rest had no rim. `fitBackground()` now sizes the copy to the layer and
shifts its background into place instead. `<img>` backdrops still use the old copy. If you update
the engine, carry this change over, or check a card near the bottom of the screen in Safari.

Used by `#lib/ui/glass.ts` (loader), `TabBar.svelte` (`<lg-navbar>`) and `GlassSurface.svelte` (`<lg-panel>`).
