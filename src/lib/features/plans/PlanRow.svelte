<script lang="ts">
	/** One plan in the Plans list, as a tappable glass card that opens its summary. */
	import { arrive, changed, leave } from '#lib/ui/motion.js';
	import type { Plan } from '#lib/types.js';
	import { describePlanTime } from './describe.js';
	import EntryCard from './EntryCard.svelte';

	interface Props {
		plan: Plan;
		/** Earlier today and already over. */
		past?: boolean;
	}

	let { plan, past = false }: Props = $props();

	const detail = $derived([plan.location, plan.notes.split('\n')[0]].filter(Boolean).join(' · '));
</script>

<li
	in:arrive
	out:leave
	use:changed={`${plan.title}|${plan.startsAt}|${plan.location}|${plan.notes}`}
>
	<EntryCard
		href="/plans/{plan.id}"
		when={describePlanTime(plan)}
		title={plan.title}
		detail={detail || undefined}
		{past}
	/>
</li>

<style>
	li {
		list-style: none;
	}
</style>
