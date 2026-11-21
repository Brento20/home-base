<script lang="ts">
	/**
	 * Five stars. Read-only by default; with `name` it's a row of radio buttons you tap to rate
	 * (inside a form), and with `autosubmit` a tap saves straight away.
	 */
	import Icon from '#lib/ui/Icon.svelte';

	interface Props {
		value: number | null;
		size?: number;
		/** Makes it a rating control: the radio group's name, usually 'stars'. */
		name?: string;
		/** What's being rated, for screen readers ("Chicken biryani"). */
		label?: string;
		autosubmit?: boolean;
	}

	let { value, size = 16, name, label = 'this', autosubmit = false }: Props = $props();

	// What the stars show: the saved value until you pick one.
	let picked = $state<number | null>(null);
	const shown = $derived(picked ?? value ?? 0);

	// On click rather than change, so tapping your current rating still saves it (confirming
	// "How was it?" with the stars you'd already given).
	function choose(event: Event, stars: number) {
		picked = stars;
		if (autosubmit) (event.currentTarget as HTMLInputElement).form?.requestSubmit();
	}
</script>

{#if name}
	<fieldset class="stars input" style:--star={`${size}px`}>
		<legend class="visually-hidden">Rate {label}</legend>
		{#each [1, 2, 3, 4, 5] as stars (stars)}
			<label class="star" class:on={stars <= shown} data-press>
				<input
					class="hidden-input"
					type="radio"
					{name}
					value={stars}
					checked={stars === (picked ?? value)}
					onclick={(event) => choose(event, stars)}
				/>
				<Icon name="star" {size} filled={stars <= shown} />
				<span class="visually-hidden">{stars} {stars === 1 ? 'star' : 'stars'}</span>
			</label>
		{/each}
	</fieldset>
{:else if value}
	<span class="stars" role="img" aria-label="{value} out of 5 stars">
		{#each [1, 2, 3, 4, 5] as stars (stars)}
			<span class="star" class:on={stars <= value}
				><Icon name="star" {size} filled={stars <= value} /></span
			>
		{/each}
	</span>
{/if}

<style>
	.stars {
		display: inline-flex;
		align-items: center;
		gap: 1px;
		margin: 0;
		padding: 0;
		border: 0;
		color: var(--colour-text-faint);
	}

	.star.on {
		color: var(--colour-accent);
	}

	.input {
		gap: 2px;
	}

	.input .star {
		position: relative;
		display: grid;
		place-items: center;
		width: calc(var(--star) + 14px);
		height: calc(var(--star) + 14px);
		border-radius: 50%;
		cursor: pointer;
		transition:
			color var(--duration-quick) var(--ease-out),
			transform var(--duration-release) var(--spring-gentle);
	}

	.input .star:global([data-pressed]) {
		transform: scale(0.85);
		transition-duration: var(--duration-press);
		transition-timing-function: var(--ease-out);
	}

	.input .star:has(input:focus-visible) {
		outline: 2px solid var(--colour-accent);
		outline-offset: -2px;
	}
</style>
