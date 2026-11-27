/**
 * Saving a form without the screen jumping: one way for every form and tap in the app.
 *
 *   const saving = save({ optimistic: () => true });
 *   <form method="POST" action="?/complete" use:enhance={saving.enhance}>
 *   saving.busy     // a save is on its way (for "Saving…" and disabled buttons)
 *   saving.pending  // the instant change from `optimistic`, or undefined
 *
 * What it gets right, each the fix for a glitch you could see:
 *
 *   - The instant change stays up until the fresh data is on screen, not just until the reload
 *     returns. Tabs stream their data (src/lib/server/soon.ts), so a reload can come back before
 *     the data does; clearing then showed the old copy for a beat (a tick or reaction went
 *     on → off → on). `refresh` waits for the streamed data too (`settled`).
 *   - Taps in a row don't undo each other: the instant change belongs to the newest tap, and an
 *     earlier tap finishing doesn't clear it. With `serial`, each tap waits for the one before
 *     to be answered, so the server sees them in the order they were made.
 *   - Reloads after saves are shared (`refresh`): ten ticks in the supermarket make one or two
 *     reloads, not ten.
 *   - `refresh` says what to reload: everything (the default), a few `depends` keys, or nothing
 *     (the tap's own change is the whole story, as with reactions).
 *
 * `saveEach` is the same for a list of rows, with the instant change and busy flag per row:
 * `ticks.for(item.id)` for the form, `ticks.pending(item.id)` and `ticks.busy(item.id)` to show.
 */
import { tick } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { invalidate, refreshAll } from '$app/navigation';
import { page } from '$app/state';
import type { ActionResult, SubmitFunction } from '$app/forms';

/** What to reload once a save is in: everything, the loads that `depends` on these keys, or nothing. */
export type Refresh = 'all' | 'none' | readonly string[];

type SubmitInput = Parameters<SubmitFunction>[0];

export interface SaveOptions<P> {
	/** As the form sends. Return false to stop it (nothing typed, say); set extra fields here. */
	start?(input: SubmitInput, key: string): boolean | void;
	/** The change to show straight away, until the fresh data is on screen. */
	optimistic?(input: SubmitInput, key: string): P;
	/** Send one at a time: each waits for the one before to be answered. For taps that flip. */
	serial?: boolean;
	/** The server's answer, before anything reloads. Can wait (to let a +1 land). */
	answered?(result: ActionResult, detail: Detail<P>): void | Promise<void>;
	/** What to reload after a success. Defaults to everything. */
	refresh?: Refresh;
	/** Empty the form after a success. Off by default: most forms here keep what was typed. */
	reset?: boolean | ((result: ActionResult) => boolean);
	/** Follow the result to the action's own page. Off for actions posted from another screen. */
	navigate?: boolean;
	/**
	 * Keep a success or failure to yourself (`answered` handles it) rather than putting it in the
	 * page's `form`. For sheets and small helpers that show their own outcome.
	 */
	quiet?: boolean;
	/** Each save, once its fresh data is on screen (or it failed). */
	after?(result: ActionResult, detail: Detail<P>): void;
}

/** Which row a save was for, and the instant change it showed. */
export interface Detail<P> {
	key: string;
	value: P | undefined;
}

const isPromise = (value: unknown): value is Promise<unknown> =>
	typeof (value as Promise<unknown> | null)?.then === 'function';

/**
 * Resolves once the page's data is all on screen, including anything the load streamed
 * (Today's feed, a tab's screen when the phone had a copy).
 */
export async function settled() {
	await tick();
	const streaming = Object.values(page.data ?? {}).filter(isPromise);
	if (streaming.length) await Promise.allSettled(streaming);
	await tick();
}

// Reloads asked for while one is running are gathered into one more after it.
const BATCH_MS = 30;
let wantAll = false;
// eslint-disable-next-line svelte/prefer-svelte-reactivity -- bookkeeping; never drives rendering
const wantKeys = new Set<string>();
let queued: Promise<void> | null = null;
let running: Promise<void> | null = null;

/**
 * Reloads the page's data and resolves once it's on screen (streamed parts included). Calls that
 * overlap share a reload: one already running carries on, and everything asked for meanwhile
 * goes in one reload after it. Used by saves, pull to refresh and the live refresh.
 */
export function refresh(what: Refresh = 'all'): Promise<void> {
	if (what === 'none') return Promise.resolve();
	if (what === 'all') wantAll = true;
	else for (const key of what) wantKeys.add(key);

	queued ??= (async () => {
		while (running) await running.catch(() => {});
		await new Promise((resolve) => setTimeout(resolve, BATCH_MS));
		const all = wantAll;
		const keys = [...wantKeys];
		wantAll = false;
		wantKeys.clear();
		queued = null;
		const run = (async () => {
			await (all ? refreshAll() : Promise.all(keys.map((key) => invalidate(key))));
			await settled();
		})();
		running = run;
		try {
			await run;
		} finally {
			if (running === run) running = null;
		}
	})();
	return queued;
}

/** Saves for a list of rows, each with its own instant change and busy flag. */
export class SaveEach<P = true> {
	readonly #options: SaveOptions<P>;
	readonly #pending = new SvelteMap<string, P>();
	readonly #busy = new SvelteMap<string, number>();
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- bookkeeping; never drives rendering
	readonly #newest = new Map<string, number>();
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- bookkeeping; never drives rendering
	readonly #answered = new Map<string, Promise<void>>();
	#count = 0;

	constructor(options: SaveOptions<P> = {}) {
		this.#options = options;
	}

	/** The newest tap's instant change for this row, while it's on its way. */
	pending(key = ''): P | undefined {
		return this.#pending.get(key);
	}

	/** Whether this row has a save on its way. */
	busy(key = ''): boolean {
		return (this.#busy.get(key) ?? 0) > 0;
	}

	/** Whether any row has a save on its way. */
	get anyBusy(): boolean {
		return this.#busy.size > 0;
	}

	/** The `use:enhance` function for this row's form. */
	for(key = ''): SubmitFunction {
		return async (input) => {
			const options = this.#options;
			if (options.start?.(input, key) === false) return input.cancel();

			const id = ++this.#count;
			this.#newest.set(key, id);
			this.#busy.set(key, (this.#busy.get(key) ?? 0) + 1);
			const value = options.optimistic?.(input, key);
			if (options.optimistic) this.#pending.set(key, value as P);

			// The next tap on this row (with `serial`) waits until this one is answered.
			let markAnswered = () => {};
			const before = this.#answered.get(key);
			this.#answered.set(key, new Promise<void>((resolve) => (markAnswered = resolve)));

			let finished = false;
			const finish = (result: ActionResult | null) => {
				if (finished) return;
				finished = true;
				markAnswered();
				const left = (this.#busy.get(key) ?? 1) - 1;
				if (left > 0) this.#busy.set(key, left);
				else this.#busy.delete(key);
				// Only the newest tap clears the instant change: an older one finishing mustn't.
				if (this.#newest.get(key) === id) this.#pending.delete(key);
				if (result) options.after?.(result, { key, value });
			};
			// Called off (a newer submission, leaving the page): nothing comes back.
			input.controller.signal.addEventListener('abort', () => finish(null), { once: true });

			if (options.serial && before) await before;

			return async ({ result, update }) => {
				markAnswered();
				try {
					await options.answered?.(result, { key, value });
					const reset =
						typeof options.reset === 'function' ? options.reset(result) : (options.reset ?? false);
					const was = page.url.href;
					const own = options.quiet && (result.type === 'success' || result.type === 'failure');
					if (!own) await update({ reset, refreshAll: false, navigate: options.navigate ?? true });
					// A redirect or a move to the action's page has loaded fresh data already.
					if (result.type === 'success' && page.url.href === was) {
						await refresh(options.refresh ?? 'all');
					}
				} finally {
					finish(result);
				}
			};
		};
	}
}

/** One form's save: `enhance` for the form, `busy` and `pending` to show. */
export function save<P = true>(options: SaveOptions<P> = {}) {
	const saves = new SaveEach<P>(options);
	return {
		enhance: saves.for(),
		get busy() {
			return saves.busy();
		},
		get pending() {
			return saves.pending();
		}
	};
}

/**
 * For a form with nothing of its own to show while it saves (a Revoke or Accept button): the
 * same rules as everything else (reload shared, fresh data on screen before it's done).
 */
export const saveForm: SubmitFunction = new SaveEach({ reset: true }).for();

/** A pause, for letting an animation land before a row moves on. */
export const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
