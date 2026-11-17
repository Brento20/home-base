# home base

Household app for friends who live together. SvelteKit 3 + Supabase, installed on each person's iPhone.

## Glass

- Use the **liquid-glass-web** skill (liquidglass.dev) for every glass element. Read its SKILL.md before adding or changing glass. If it isn't installed, run `curl -fsSL https://liquidglass.dev/install-skill.sh | sh` (installs into `~/.claude/skills` and/or `~/.codex/skills`).
- The engine and web components are vendored unchanged in `src/lib/vendor/liquid-glass/`. Don't rewrite the filter code; the skill explains why.
- Cards use `src/lib/ui/GlassSurface.svelte` (an empty `<lg-panel>` behind the content). Pass `squish` for anything tappable and `lazy` for cards in long lists, so a page stays within a few dozen live glass elements.
- Navigation pills use `<lg-navbar>` (`TabBar.svelte`, `SegmentedNav.svelte`), with the active item driven by the URL.
- Everything refracts the aligned copy of `.app-backdrop` (root layout, `data-lg-backdrop`), so glass works in Safari and Firefox, not only Chrome.
- Card optics live in `GlassSurface.svelte` (refraction 32, bezel 0.55, curvature 4, chroma 0.22, specular 0.75, frost 1): stronger than the skill's card row so the rim visibly bends the backdrop. Small fields pass `bezel={0.4}` and a lower refraction. The tab bar is a glass rod (bezel 1, curvature 2.5); its indicator lens is tuned through `glass.update()` in `TabBar.svelte`.
- `--glass-smoke` (26%) is the tint that keeps text at 4.5:1 over the brightest part of the backdrop. Recheck contrast before lightening it.
- The warm glow is reserved for the next plan on Today.

## Motion

- Presses squish (wider and shorter) on `--duration-press`, then spring back on `--spring-bouncy` over `--duration-release`. Glass cards squish their glass with a JS spring; their content layer's outline is hidden from press until the spring settles (`data-pressed`, set by GlassSurface from the spring, not `:active`, which iOS skips) so it can't separate from the moving glass rim. Never scale glass, or the layer carrying its outline, with CSS `transform: scale()`.
- Page transitions use the View Transitions API (`src/lib/ui/page-transitions.ts`, motion in base.css). Only the element named `page` moves; the tab bar and backdrop stay still. Direction follows tab order (`src/lib/ui/tabs.ts`) and path depth. Query-only changes don't animate.
- Everything collapses to a quick fade or nothing under `prefers-reduced-motion`.

## Installed app (PWA)

- `src/service-worker/index.ts` caches the built files and static files on install, and any `/_app/immutable/` file as it loads. Pages and their `__data.json` are network-first with a 4 second timeout, falling back to the saved copy, then `static/offline.html`. Saving a page also saves its data, because SvelteKit can't fall back offline from a missing data file. Match cached files with `ignoreVary`.
- Never cache non-GET requests. Signing out (`POST /logout`, or landing on `/welcome`) deletes the `pages` cache.
- Test offline behaviour against `npm run build` and `vite preview`, not the dev server.
- `AppStatus.svelte` shows the offline pill and the update notice; the new service worker only takes over when Refresh is tapped.
- Launch screens in `static/splash/` are generated to match the backdrop; add a size there and in `app.html` when a new iPhone screen size appears.

## Code

- SvelteKit 3: config in `vite.config.ts`, imports as `#lib/….js`, env vars declared in `src/env.ts` and read from `$app/env/private`.
- Route files assemble screens and handle form actions; `src/lib/features/<feature>/` owns components and `*.server.ts` data functions; `src/lib/ui/` holds shared pieces.
- `hooks.server.ts` puts every request in one of four stages (signed out, profile, home, ready) and `src/lib/features/account/stage.ts` decides which routes each stage may open. New routes go in the matching group: `(public)`, `(setup)` or `(app)`.
- Homes can hold any number of people. Don't assume two: use `household.members`, and `Avatar.svelte` for a person's photo or initial.
- Supabase calls stay server-side. Every table has row-level security scoped to the household; add a migration in `supabase/migrations/` for schema changes.
- Money is integer cents everywhere; format with `src/lib/features/expenses/money.ts`. Split and balance maths live in `split.ts` and `balances.ts`, shared by the browser preview and the server, with unit tests worth rerunning after changes.
- Chart colours are the `--chart-*` tokens: a colour-blind-safe set validated against the dark background. Re-validate before changing them, and always label categories by name too.
- Dates and times go through `src/lib/time.ts` (household time zone, Australia/Sydney).
- With no `.env`, the app runs on in-memory sample data (`src/lib/server/sample-data.ts`); keep new features working in that mode.
- CSS: plain custom properties from `src/lib/styles/tokens.css`, named for what they're for. No utility-class frameworks. No all-caps text.
