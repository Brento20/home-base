# home base

Household app for friends who live together. SvelteKit 3 + Supabase, installed on each person's iPhone.

## Glass

- Glass is plain CSS, built to stay light on an older iPhone. There's no glass engine: liquidglass.dev was removed because Safari draws its refraction on the CPU, which made every tab change stutter (it's in git history). Don't bring back SVG-filter refraction or a live blur on anything that's always on screen or moves.
- Cards use `src/lib/ui/GlassSurface.svelte`: smoked glass with no live blur. A see-through body (`--glass-body`), a specular rim drawn in CSS (`--glass-rim`, bright top-left, soft bottom-right) and light inside the top edge (`--glass-inner-light`). The backdrop is a soft gradient, so a blur behind cards changed almost nothing visible but had to be redrawn on every scroll and swipe frame. Pass `squish` for anything tappable.
- The tab bar (`TabBar.svelte`) is frosted (the one fixed thing with a live blur), and the page fades out before it reaches it: the edge fades in the app layout paint the backdrop itself (`.backdrop-paint`, lined up with the real one) over the page, under the status bar and above the tab bar. iOS Safari now and then drops a fixed element's blur and fill for a frame as content scrolls under it; with the page already faded there, nothing sharp flashes through. Keep the fades if you touch the bar. It and the Lists | Tasks switch (`SegmentedNav.svelte`) share `PillNav.svelte`: a glass pill that slides with a CSS transform on `--spring-soft` (calm, a hint of settle) and sets off when a navigation starts.
- Otherwise, live blur (`--glass-blur`) is only for things that are briefly on screen: menus, notices, the refresh bead.
- `--glass-body` is the tint that keeps text at 4.5:1 over the brightest part of the backdrop. Recheck contrast before lightening it.
- The warm glow is reserved for the next plan on Today.

## Motion

- Presses come from one listener, `src/lib/ui/press.ts`, which puts `data-pressed` on whatever's under the finger: after a 60ms beat (so a scroll starting on a card doesn't flash it), held at least 130ms (so quick taps are felt), dropped at once if the finger moves or the page scrolls. Style `[data-pressed]` (`:global([data-pressed])` inside components), never `:active`, which iOS often skips. Go in fast on `--duration-press` with `--ease-out`, come back on `--spring-gentle` over `--duration-release`.
- The press language: buttons sink (`scale(0.96)`, round ones `0.9`) and accent ones deepen to `--colour-accent-pressed`; ticks and rings shrink a little; quiet text buttons and links dim (the fallback in forms.css, which lists the controls that have their own press). Glass cards squish as a whole (wider and shorter) through the Web Animations API on `scale`, timed by the same `data-pressed`, but not when a button inside them is pressed.
- Page transitions (`src/lib/ui/page-transitions.ts`, motion in base.css) use the View Transitions API on the element marked `data-page`: the new screen glides in from the direction of travel while the old one drifts away and fades. Direction follows tab order (`src/lib/ui/tabs.ts`) and path depth; query-only changes don't animate. They're only cheap while nothing on the page is a live filter, so keep it that way (the liquid-glass filters made every snapshot slow). As a screen arrives, its sections fade and rise in top to bottom (`reveal()`): direct children of `[data-page]`, or the children of its `.stack` / `.form-stack`, 45ms apart, visible ones only, not on first load.
- A transition can't start until the next screen's data is in, so load ahead: every tab's code is preloaded when the app opens (`preloadTabs`), links preload their data on touch (`data-sveltekit-preload-data="hover"` covers touchstart), and a swipe preloads its destination as soon as it's recognised (AppGestures). Measure with `scripts/navperf.py` (4× CPU throttle).
- The session is checked with `getClaims()` in hooks.server.ts (local signature check, no auth round trip with asymmetric signing keys). `locals.user` is `{ id, email }`, not a full Supabase user.
- Phones are portrait only: the manifest locks installed Android apps, and a short landscape screen shows the “Turn me upright” note from app.html (styles in base.css), since iPhones ignore the lock.
- Everything collapses to a quick fade or nothing under `prefers-reduced-motion`.
- Animate only transform and opacity, and as little as possible: every blur or filter under something moving is redrawn each frame, which phones feel long before a laptop does. Judge motion changes in a CPU-throttled browser (4×) and then on a real iPhone, not by eye on a laptop.

## Voice

- Copy lives in `src/lib/copy/voice.ts`: heading variants, placeholder pools and empty states. Warm and a bit cheeky, said the way you'd say it to the person you live with. Prompts ask (“What’s the plan?”), they don't label (“New plan”).
- About half of each placeholder pool is pop culture, with a Sydney accent. Keep references timeless (Mean Girls, Friends, Harry Potter, Home and Away, Mario Kart), never this year's show, tour or trend, so the app doesn't date. Keep lines to one phone line, never quote lyrics, and don't put words in a real person's mouth.
- Headings and empty states use `pick()` (`src/lib/copy/pick.ts`): the first line during the server render and hydration, so there's no flicker, then a random one for every screen opened in the app.
- Text fields get a scrolling placeholder with `placeholder={POOL[0]} use:placeholderReel={POOL}` (`src/lib/ui/placeholder-reel.ts`). It freezes on focus, hides once typed in, and holds still under reduced motion. Don't autofocus a field with a reel; a focused reel never moves.
- Only one reel moves at a time: the first empty, untouched field on screen. Filling it in, or tapping in and leaving it empty, passes the lead down the page. Each reel rests after a few suggestions. Timing lives in the constants at the top of `placeholder-reel.ts` and the line transition in `forms.css`; keep them in step.
- Reels are for the main question on a screen. Optional fields get a still `placeholder={pick(POOL)}`, and on busy forms they sit behind “+ Place” style chips (a label for a hidden checkbox, shown with CSS, see `PlanForm.svelte`) so the form opens on one question.
- Field labels stay understandable on their own: the reel is decoration (aria-hidden), the label is what screen readers hear.

## Gestures

- `src/lib/ui/AppGestures.svelte` (in the app layout) handles swipes and pull to refresh; `src/lib/ui/gestures.ts` says what each swipe means. On a tab's own page, swiping moves between tabs in tab bar order; on any deeper page, swiping right goes back (through history, or up to the tab if the page was opened directly).
- Touches starting on text fields, horizontal scrollers (except at the screen's edge) or anything with `data-gesture-ignore` are left alone. Add that attribute to anything new that drags sideways.
- Listeners are passive and the page only moves with `translate`, so gestures never hold up scrolling.

## Plan dinner

- The built-in library is `src/lib/features/recipes/library.json`: 66 recipes trimmed from the source file (the per-ingredient nutrition workings were dropped). It's imported on the server only. Recipes a home adds live in `public.recipes`; library ids look like `recipe_001`, home ones are uuids, and ratings and dinners refer to either by that text id.
- Every recipe's amounts are for `baseServings`. `scaleIngredients` multiplies by servings / baseServings; `formatQuantity` rounds to measurable amounts (½ tsp, 125 g, 1.2 kg). Methods never name amounts ("add half the stock"), so they read right at any serving count; keep it that way when adding recipes.
- A dinner is a task with `recipe_id`, `servings`, an optional `due_time` and a `recipe` snapshot (title, servings, scaled ingredients, steps), so it reads the same if the recipe changes. Who's cooking is the assignee. Marking it cooked is completing the task (it earns a point). Skipping deletes it. Dinners show on Today for the coming week (Mark as cooked only from their day on); a dinner with no time sorts as 7pm, and when the row is full, chores give way before plans and dinners (`coming-up.ts`).
- Ratings: one per person per recipe (`recipe_ratings`), editable; 5 stars is a favourite. The card at the top of Plan dinner (`getDinnerPrompt`) asks "How was it?" for a cooked dinner you haven't answered (`dinner_checkins`), or "Did you make it?" when a dinner's time is an hour past (7pm if it has no time) and it's still open. Rating a recipe anywhere, or Not now, answers it for all its recent dinners.
- `recipes.server.ts` owns the library, a home's own recipes, ratings and shopping lists; `dinners.server.ts` owns scheduled dinners (schedule, reschedule, cooked, skip) and the check-in prompt.
- Sheets (Add to Lists, Schedule) use `src/lib/ui/Sheet.svelte`, a native modal `<dialog>` that slides up over everything.

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
- Database errors never reach the screen as raw Postgres text: throw with `dbError(problem)` and return form failures with `friendlyMessage(problem)` from `src/lib/server/db.ts`. It logs the real error and shows a plain one, except our own `raise exception` messages (code P0001), which are written for people.
- Supabase calls stay server-side. Every table has row-level security scoped to the household; add a migration in `supabase/migrations/` for schema changes.
- Money is integer cents everywhere; format with `src/lib/features/expenses/money.ts`. Split and balance maths live in `split.ts` and `balances.ts`, shared by the browser preview and the server, with unit tests worth rerunning after changes.
- Chart colours are the `--chart-*` tokens: a colour-blind-safe set validated against the dark background. Re-validate before changing them, and always label categories by name too.
- Dates and times go through `src/lib/time.ts` (household time zone, Australia/Sydney).
- With no `.env`, the app runs on in-memory sample data (`src/lib/server/sample-data.ts`); keep new features working in that mode.
- A form that posts to another page's action (the feed's reactions and post menu post to `/feed/[id]`) passes `navigate: false` to `update()` in its `enhance` callback; SvelteKit 3 otherwise moves to that page, like a plain browser submit.
- The home feed's photos live in the private `feed-photos` bucket under `<household id>/`, served through `routes/(app)/feed/photos/[postId]`; shrink photos in the browser with `src/lib/ui/photo.ts` before upload.
- A page's sticky actions above the tab bar go in `src/lib/ui/ActionDock.svelte`, styled as the tab bar's twin (same height, fill and rim, plain secondary buttons). It has no blur: it paints its own backdrop fade underneath instead. The optional-field chips (`.extras`, `.extra-chip`) are shared in `forms.css`; a form only adds its own `:has()` show/hide rules.
- Deleting is always `ConfirmDelete` at the foot of the thing's own page (two taps; it brings its own hairline and spacing). Never hide it behind Edit, so lists, tasks, plans, notes, recipes and money items all delete the same way.
- On a detail screen, Edit goes in `PageHeader`'s `trailing` slot (the back-link row's right end) as `.button-edit`. Add buttons stay beside the title.
- Pages you push into have no Cancel: the back link at the top is the way out. Primary buttons sit at the left of `.form-actions`.
- Before handing work back: `npm run check` (types), `npm run lint` (Prettier, then ESLint, which flags unused code and Svelte mistakes) and `npx vite build` all clean.
- CSS: plain custom properties from `src/lib/styles/tokens.css`, named for what they're for. No utility-class frameworks. No all-caps text.
