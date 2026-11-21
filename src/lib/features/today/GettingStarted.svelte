<script lang="ts">
	/**
	 * First things for a new home, on Today. Steps tick themselves off as the home does them
	 * (getting-started.ts); the close button hides the card for good.
	 */
	import { enhance } from '$app/forms';
	import Icon from '#lib/ui/Icon.svelte';
	import type { StartStep } from './getting-started.js';

	interface Props {
		steps: StartStep[];
	}

	let { steps }: Props = $props();
	const done = $derived(steps.filter((step) => step.done).length);
</script>

<section class="start" aria-labelledby="start-heading">
	<div class="heading-row">
		<div>
			<h2 id="start-heading" class="caption-label">Getting started</h2>
			<p class="progress">{done} of {steps.length} done</p>
		</div>
		<form method="POST" action="?/dismissStart" use:enhance>
			<button class="close" aria-label="Hide getting started"
				><Icon name="close" size={16} /></button
			>
		</form>
	</div>

	<ul class="grouped">
		{#each steps as step (step.id)}
			<li>
				{#if step.done}
					<span class="grouped-row is-done">
						<span class="tick done" aria-hidden="true"><Icon name="check" size={14} /></span>
						<span class="grouped-label">{step.label}</span>
						<span class="visually-hidden">Done</span>
					</span>
				{:else}
					<a class="grouped-row" href={step.href}>
						<span class="tick" aria-hidden="true"></span>
						<span class="grouped-label">{step.label}</span>
						<span class="grouped-chevron"><Icon name="chevron" size={16} /></span>
					</a>
				{/if}
			</li>
		{/each}
	</ul>
</section>

<style>
	.heading-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin: 0 0 8px 16px;
	}

	.progress {
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}

	.close {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border: 0;
		border-radius: 50%;
		background: var(--colour-fill);
		color: var(--colour-text-muted);
	}

	.tick {
		display: grid;
		flex: none;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1.5px var(--colour-text-faint);
	}

	.tick.done {
		background: var(--colour-accent);
		box-shadow: none;
		color: var(--colour-on-accent);
	}

	.is-done .grouped-label {
		color: var(--colour-text-muted);
		text-decoration: line-through;
		text-decoration-color: var(--colour-text-faint);
	}
</style>
