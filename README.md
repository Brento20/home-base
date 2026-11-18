# home base

A household app for friends who live together: plans, chores, lists and home notes, installed
on each person's iPhone Home Screen.
SvelteKit 3 + Supabase, with lightweight CSS glass and an original grain-and-mesh backdrop.

## Run it

```sh
npm install
npm run dev
```

Before shipping: `npm run check` (types), `npm run lint` (Prettier and ESLint), `npm run build`.

With no `.env`, the app runs on in-memory sample data (resets when the dev server restarts).
Preview other palettes with `?daypart=morning`, `?daypart=day` or `?daypart=evening`.

## Where things live

| Path                                       | What it owns                                                          |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `src/hooks.server.ts`                      | Signs each request in and sends people to the step they're up to      |
| `src/routes/(public)/`                     | Signed out: landing page (/welcome), sign up, sign in, reset password |
| `src/routes/(setup)/`                      | Profile, then Welcome home: build or join a home                      |
| `src/routes/(app)/`                        | The app itself: Today, Plans, Lists, Money, Home, plus the tab bar    |
| `src/routes/auth/`, `account/`, `avatars/` | Email links, setting a new password, serving profile photos           |
| `src/lib/features/<feature>/`              | Each feature's components and its `*.server.ts` data functions        |
| `src/lib/copy/`                            | The app's voice: headings, placeholder pools, empty states            |
| `src/lib/features/recipes/`                | Plan dinner: recipe library, scaling, search, ratings, dinners        |
| `src/routes/(app)/feed/`                   | Post update, a post with its replies, and the photo route             |
| `src/lib/ui/`                              | Shared pieces: TabBar, GlassSurface, Sheet, ActionDock, Avatar, Icon  |
| `src/lib/styles/tokens.css`                | Type, spacing, colour, glass and the three day palettes               |
| `src/lib/server/`                          | Server-only: Supabase client, friendly database errors, sample data   |
| `src/service-worker/`                      | Offline support: app shell, saved pages, the update handover          |
| `static/`                                  | Manifest, icons, iPhone launch screens, the offline page              |
| `supabase/migrations/`                     | Tables, row-level security and the database functions                 |

SvelteKit 3 notes: config lives in `vite.config.ts`, imports use `#lib/….js`, and environment
variables are declared in `src/env.ts` and imported from `$app/env/private`.

## Features so far

- **Today**: a swipeable row of what's coming up, plans and due chores in date order, with a travelling glow and a Done button on chores. Below it, your open lists, Plan dinner (it says what's on tonight once it's planned), Post update, and the home feed.
- **Plan dinner**: a recipe library (66 to start, plus any you add) with search by dish or ingredient and filters (Under 30 min, Vegetarian, Vegan, Favourites, and cuisine and protein under More filters). A recipe shows prep, cook and resting time, nutrition per serve, ingredients and method, with a servings bar at the bottom: **Add to Lists** makes a shopping list named after the meal, scaled to the servings, letting you untick what you've got; **Schedule** picks the night, an optional time and who's cooking, and makes a task carrying the scaled recipe that shows on Today on the night. The cook opens it from Today to follow along, then taps Mark as cooked (or reschedules or skips it). Next time you open Plan dinner, one card asks "How was it?" (or first "Did you make it?" if its time passed and it's still open). Ratings are one each per recipe and editable; five stars makes a favourite, and the recipe page shows everyone's.
- **Voice**: prompts ask instead of label (“What’s the plan?”), headings change on every visit, and empty fields scroll through suggestions (“Shucking oysters on the beach?” → “Brunch with Gaga?”) until you tap them. All copy is in `src/lib/copy/voice.ts`.
- **Gestures**: swipe left and right between tabs, swipe right to go back from anything deeper, and pull down to refresh.
- **Home feed**: quick updates and photos for everyone at home, on Today under the rest. Older posts load as you scroll. React with one of four reactions (one each) or open a post to reply; replies stay with the post. The post menu has **Create event**, which opens a plan draft with the post in its notes; the saved plan shows on the post and links back to it. Authors can delete their own posts and replies.
- **Plans**: upcoming plans as glass cards; tap for a summary, then Edit. All-day and overnight plans. Import an Apple Calendar `.ics` at Plans › Import (one-time copy, re-importing skips duplicates).
- **Lists › Lists**: as many named lists as you like. A list moves to Past lists once every item is ticked, and comes back if you untick or add one. Edit mode removes items, renames or deletes the list.
- **Lists › Tasks**: household chores with who, when, and how often they repeat (once, weekly, every 2 weeks or monthly). Ticking one off moves it to Past tasks; a repeating chore gets its next occurrence straight away. Monthly chores keep their day (a chore on the 31st falls on the last day of shorter months). Undo from Past tasks.
- **Points**: one for every task you tick off, shown beside your avatars on Today (this week) with a scoreboard at /points. Undo takes the point back.
- **Money**: Splitwise-style shared expenses. A home can have several groups (Our Place, Car), each with members from the home. Add an expense by saying who paid, the total, and how it's divided (equally, exact amounts or percent). Between two people the balance is one sentence ("You owe Brenton $2.50"); bigger groups show who owes whom with debts simplified, and Settle up records a repayment. **Reports** open on the current month: browse months or pick dates, see spending by category and over time, tap a category for the expenses behind it, and Compare any two ranges. Reports count each expense's full amount; repayments only move balances.
- **Sign up and homes**: a landing page at /welcome, sign up with email and password, confirm by email, then a profile (name, nickname, pronouns, date of birth, photo). Then "Welcome home": build a home (name + password to share) or join one. Five wrong join attempts in 15 minutes locks you out for a while.
- **Home**: everyone in your home, notes anyone can add (wifi, bins, the spare key), with "Hide until tapped" and Copy. Home settings lets an owner rename the home and set its password.
- **Installed app**: add it to the Home Screen and it opens full screen with its own launch screen. Pages you've opened are saved, so they still open with no signal (an "Offline" pill says so); pages never opened show a friendly offline screen. When a new version is deployed, a "New version ready" notice appears and refreshes only when tapped. Signing out deletes every saved page.
- Everyone's phones stay in step by refreshing when the app comes back to the foreground and every 20 seconds.

## Step 4: connect Supabase

1. Create a Supabase project. In **Authentication › Sign In / Providers**, keep **Confirm email**
   on, and turn on **Allow new users to sign up** when you want friends to be able to make accounts.
   In **URL Configuration**, add `http://localhost:5173/**` and your live address (for example
   `https://homebase.example.com/**`) to Redirect URLs, so email links come back to the app.
2. Run the files in `supabase/migrations/` in order (SQL editor, or `supabase db push` with the CLI).
3. `cp .env.example .env` and fill in `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
4. Restart `npm run dev`. Signed out, you land on /welcome.
5. Sign up, fill in your profile and build a home. Share its name and password with whoever you
   live with; they sign up and choose Join a home.
6. For real email, add custom SMTP under **Authentication › Emails**: the built-in sender only
   manages a few emails an hour.

## Step 5: first milestone

1. Deploy to Cloudflare Workers (below). Add the live address to Supabase's Redirect URLs and
   make it the Site URL.
2. On each iPhone, open the site in Safari › Share › **Add to Home Screen**.
3. Sign up on one phone and build a home; sign up on another and join it.
4. Add **Limes** on one phone and check it off on the other. Done.

## Hosting: Cloudflare Workers

`@sveltejs/adapter-cloudflare` builds the app into `.svelte-kit/cloudflare`; `wrangler.jsonc`
holds the deploy settings.

- **Try the production build locally** on Cloudflare's runtime: put the two Supabase values in
  `.dev.vars` (same format as `.env`, ignored by git), then `npm run preview:cf` and open
  http://localhost:8787.
- **Deploy from your Mac**: `npx wrangler login` once, then `npm run deploy`. The app goes live
  at `https://home-base.<your-subdomain>.workers.dev`.
- **Environment variables**: `SUPABASE_URL` is in `wrangler.jsonc`, since every deploy
  replaces plain variables with that file's `vars`. `SUPABASE_PUBLISHABLE_KEY` is a secret: add
  it once in the Cloudflare dashboard (Workers › home-base › Settings › Variables and Secrets,
  type Secret). Secrets survive deploys. Without the key the live site runs on sample data.
- **Your own domain**: Workers › home-base › Settings › Domains & Routes › Add › Custom domain
  (the domain's DNS has to be on Cloudflare). Then update Supabase's Site URL and Redirect URLs.
- **Deploy on every push** (optional): connect the GitHub repo under Workers › home-base ›
  Settings › Builds, with build command `npm run build` and deploy command `npx wrangler deploy`.

`assets.html_handling` is `none` so `/offline.html` is served as is; Cloudflare's default
redirect to `/offline` would break the service worker's offline page.

## Before calling the shell finished

- Check the glass in Safari on a real iPhone: the smoked cards and the frosted tab bar.
- Check the tab bar clears the home indicator when launched from the Home Screen.
- Check secondary text stays at 4.5:1 or better on all three palettes.
