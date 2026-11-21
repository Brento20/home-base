<script lang="ts">
	/**
	 * The day in a line, under Today's date. The plain line is always there; with the AI on, a
	 * cheekier one fades in once it's ready.
	 *
	 * Each AI line belongs to one set of facts (the fingerprint, which changes when a task, plan,
	 * dinner or balance does, or the day ticks over). It's kept in the browser against that key,
	 * shown only while the facts still match, and asked for again whenever they change, not just
	 * when Today first appears: Today often appears from its kept copy and gets fresh facts a
	 * moment later. If the AI came back empty, it tries again after a while.
	 */
	import Icon from '#lib/ui/Icon.svelte';

	interface Props {
		plain: string;
		/** Changes only when the week's facts do. */
		fingerprint: string;
		ai: boolean;
	}

	let { plain, fingerprint, ai }: Props = $props();

	/** The newest AI line and the facts it was written for. */
	let written = $state<{ key: string; line: string | null } | null>(null);
	/** Only shown while it matches the facts on screen; otherwise the (fresh) plain line. */
	const friendly = $derived(written?.key === fingerprint ? written.line : null);

	const STORE = 'home-base:week-line';
	/** After an empty answer (AI busy, over the limit, or a line that got a number wrong). */
	const RETRY_EMPTY_MS = 15 * 60_000;
	/** The facts a request is out for, so the same ones aren't asked for twice at once. */
	let asking: string | null = null;

	/** The saved line for these facts: a string, null (asked, and the plain line won), or undefined (not asked yet). */
	function remembered(key: string): string | null | undefined {
		try {
			const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null');
			if (saved?.key !== key) return undefined;
			if (saved.line === null && Date.now() - (saved.at ?? 0) > RETRY_EMPTY_MS) return undefined;
			return saved.line;
		} catch {
			return undefined;
		}
	}

	function remember(key: string, line: string | null) {
		try {
			localStorage.setItem(STORE, JSON.stringify({ key, line, at: Date.now() }));
		} catch {
			// Private mode or full storage: it'll just ask again next time.
		}
	}

	$effect(() => {
		if (!ai) return;
		const key = fingerprint;
		const saved = remembered(key);
		if (saved !== undefined) {
			written = { key, line: saved };
			return;
		}
		if (asking === key) return;
		asking = key;
		fetch('/summary')
			.then((response) => (response.ok ? response.json() : null))
			.then((answer: { key: string; line: string | null } | null) => {
				if (!answer) return;
				// Kept under the facts the server wrote it for. If those are newer than the ones on
				// screen (Today was showing its kept copy), it shows the moment the fresh facts land.
				remember(answer.key, answer.line);
				written = answer;
			})
			.catch(() => {
				// Offline or failed: the plain line stays, which is fine.
			})
			.finally(() => {
				if (asking === key) asking = null;
			});
	});
</script>

<p class="week" aria-live="polite">
	{#key friendly ?? plain}
		<span class="line">
			{#if friendly}
				<!-- Marked as AI-written, as Apple's guidance asks. -->
				<span class="mark"><Icon name="sparkle" size={13} /></span><span class="ai-said">
					Written by AI:
				</span>{friendly}
			{:else}{plain}{/if}
		</span>
	{/key}
</p>

<style>
	.week {
		margin: var(--space-s) 0 0;
		font-size: var(--text-small);
		line-height: 1.4;
		color: var(--colour-text-muted);
	}

	.mark {
		display: inline-block;
		margin-right: 5px;
		vertical-align: -1px;
	}

	.line {
		display: block;
		animation: fade-in 400ms var(--ease-out) both;
	}

	@media (prefers-reduced-motion: reduce) {
		.line {
			animation: none;
		}
	}
</style>
