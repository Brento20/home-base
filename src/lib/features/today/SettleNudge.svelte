<script lang="ts">
	/**
	 * The settle-up nudge on Today, for someone who's asked for one (Preferences › Money): "You're
	 * about $120 behind with Chris", with Settle up and Not now. Not now quiets it for a week, or
	 * until you're another nudge's worth further behind. Stays out of the way: one slim card.
	 */
	import { onMount } from 'svelte';
	import { aboutAmount, type SettleNudge } from '#lib/features/expenses/nudge.js';
	import Icon from '#lib/ui/Icon.svelte';
	import { arrive, leave } from '#lib/ui/motion.js';
	import type { Profile } from '#lib/types.js';

	interface Props {
		nudge: SettleNudge;
		people: Profile[];
		/** The nudge amount, in dollars: how much further behind brings it back early. */
		step: number;
	}

	let { nudge, people, step }: Props = $props();

	const KEY = 'hb-nudge-quiet';
	const WEEK = 7 * 24 * 60 * 60 * 1000;

	/** Whether Not now still holds: within the week, and not much further behind since. */
	function quieted(): boolean {
		try {
			const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as {
				group: string;
				cents: number;
				at: number;
			} | null;
			return Boolean(
				saved &&
				saved.group === nudge.groupId &&
				Date.now() - saved.at < WEEK &&
				nudge.cents < saved.cents + step * 100
			);
		} catch {
			return false;
		}
	}

	// Read once the page is on screen (local storage isn't there during the server render).
	let mounted = $state(false);
	let dismissed = $state(false);
	onMount(() => (mounted = true));
	const hidden = $derived(!mounted || dismissed || quieted());

	function notNow() {
		dismissed = true;
		try {
			localStorage.setItem(
				KEY,
				JSON.stringify({ group: nudge.groupId, cents: nudge.cents, at: Date.now() })
			);
		} catch {
			// Private browsing: it comes back next visit, which is fine.
		}
	}

	const who = $derived(people.find((person) => person.id === nudge.to)?.displayName ?? null);
</script>

{#if !hidden}
	<aside class="nudge" aria-label="Settle up" in:arrive={{ y: 8 }} out:leave>
		<span class="icon" aria-hidden="true"><Icon name="money" size={18} /></span>
		<p class="text">
			You’re about {aboutAmount(nudge.cents)} behind{who ? ` with ${who}` : ''}
			<span class="where">in {nudge.groupName}</span>
		</p>
		<div class="actions">
			<button type="button" class="button-quiet quiet" onclick={notNow}>Not now</button>
			<a class="button-secondary settle" href="/money/{nudge.groupId}/settle">Settle up</a>
		</div>
	</aside>
{/if}

<style>
	.nudge {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4px 12px;
		align-items: center;
		padding: 14px 16px 10px;
		border-radius: 18px;
		background: var(--colour-fill);
		box-shadow: inset 0 0 0 var(--hairline) var(--colour-separator);
	}

	.icon {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 10px;
		background: var(--colour-accent-soft);
		color: var(--colour-accent);
	}

	.text {
		margin: 0;
		font-weight: var(--weight-medium);
	}

	.where {
		display: block;
		font-size: var(--text-caption);
		font-weight: var(--weight-regular);
		color: var(--colour-text-muted);
	}

	.actions {
		grid-column: 1 / -1;
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}

	.quiet {
		min-height: var(--tap-target);
		color: var(--colour-text-muted);
	}

	.settle {
		min-height: 36px;
		align-self: center;
		text-decoration: none;
	}
</style>
