<script lang="ts">
	/** The method, numbered. */
	interface Props {
		steps: string[];
	}

	let { steps }: Props = $props();
</script>

<ol class="steps">
	{#each steps as step, index (index)}
		<li>
			<span class="number" aria-hidden="true">{index + 1}</span>
			<p>{step}</p>
		</li>
	{/each}
</ol>

<style>
	.steps {
		display: flex;
		flex-direction: column;
		gap: var(--space-m);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		gap: 14px;
	}

	.number {
		display: grid;
		place-items: center;
		flex: none;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1.5px var(--colour-hairline-strong);
		color: var(--colour-text-muted);
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		font-variant-numeric: tabular-nums;
	}

	p {
		margin: 3px 0 0;
		line-height: 1.5;
	}
</style>
