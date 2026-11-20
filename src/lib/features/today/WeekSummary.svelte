<script lang="ts">
	/**
	 * The day in a line, under Today's date. The plain line is always there; with the AI on, a
	 * cheekier one fades in once it's ready. It's kept in the browser against the facts' key,
	 * so it's only asked for again when the day or the facts change (a new task, a different
	 * balance). If the AI came back empty, it tries again after an hour at most.
	 */
	import { onMount } from 'svelte';
	import Icon from '#lib/ui/Icon.svelte';

	interface Props {
		plain: string;
		/** Changes only when the week's facts do. */
		fingerprint: string;
		ai: boolean;
	}

	let { plain, fingerprint, ai }: Props = $props();
	let friendly = $state<string | null>(null);
	const STORE = 'home-base:week-line';
	/** After an empty answer (AI busy or off), when to try again for the same facts. */
	const RETRY_EMPTY_MS = 60 * 60_000;

	/** The saved line for today's facts: a string, null (asked, and the plain line won), or undefined (not asked yet). */
	function remembered(): string | null | undefined {
		try {
			const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null');
			if (saved?.key !== fingerprint) return undefined;
			if (saved.line === null && Date.now() - (saved.at ?? 0) > RETRY_EMPTY_MS) return undefined;
			return saved.line;
		} catch {
			return undefined;
		}
	}

	function remember(line: string | null) {
		try {
			localStorage.setItem(STORE, JSON.stringify({ key: fingerprint, line, at: Date.now() }));
		} catch {
			// Private mode or full storage: it'll just ask again next time.
		}
	}

	onMount(() => {
		if (!ai) return;
		// Asked already for these facts (even if it came back empty): don't ask again until the
		// day or the facts change, so it's at most one AI call a day unless something changes.
		const saved = remembered();
		if (saved !== undefined) {
			friendly = saved;
			return;
		}
		const asked = fingerprint;
		fetch('/summary')
			.then((response) => (response.ok ? response.json() : null))
			.then((answer: { key: string; line: string | null } | null) => {
				// Only if the week hasn't changed while it was being written.
				if (answer && answer.key === asked && asked === fingerprint) {
					friendly = answer.line;
					remember(answer.line);
				}
			})
			.catch(() => {
				// Offline or failed: the plain line stays, which is fine.
			});
	});
</script>

<p class="week" aria-live="polite">
	{#key friendly}
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
		animation: settle 400ms var(--ease-out) both;
	}

	@keyframes settle {
		from {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.line {
			animation: none;
		}
	}
</style>
