<script lang="ts">
	/**
	 * The week in a line, under Today's date. The plain line is always there; with the AI on, a
	 * friendlier one fades in once it's ready. It's kept in the browser against the facts' key,
	 * so it's only asked for again when something about the week changes.
	 */
	import { onMount } from 'svelte';

	interface Props {
		plain: string;
		/** Changes only when the week's facts do. */
		fingerprint: string;
		ai: boolean;
	}

	let { plain, fingerprint, ai }: Props = $props();
	let friendly = $state<string | null>(null);
	const STORE = 'home-base:week-line';

	function remembered(): string | null {
		try {
			const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null');
			return saved?.key === fingerprint ? saved.line : null;
		} catch {
			return null;
		}
	}

	function remember(line: string) {
		try {
			localStorage.setItem(STORE, JSON.stringify({ key: fingerprint, line }));
		} catch {
			// Private mode or full storage: it'll just ask again next time.
		}
	}

	onMount(() => {
		if (!ai) return;
		friendly = remembered();
		if (friendly) return;
		const asked = fingerprint;
		fetch('/summary')
			.then((response) => (response.ok ? response.json() : null))
			.then((answer: { key: string; line: string | null } | null) => {
				// Only if the week hasn't changed while it was being written.
				if (answer?.line && answer.key === asked && asked === fingerprint) {
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
	{#key friendly}<span class="line">{friendly ?? plain}</span>{/key}
</p>

<style>
	.week {
		margin: var(--space-s) 0 0;
		font-size: var(--text-small);
		line-height: 1.4;
		color: var(--colour-text-muted);
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
