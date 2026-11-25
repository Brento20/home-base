<script lang="ts">
	/** Someone's public profile answers (Known for, Happy to help with…), as a grouped list. */
	import { filledFields, type PublicFields } from './public-profile.js';

	interface Props {
		fields: PublicFields;
		label: string;
	}

	let { fields, label }: Props = $props();
	const filled = $derived(filledFields(fields));
</script>

{#if filled.length}
	<dl class="grouped public-fields" aria-label={label}>
		{#each filled as field (field.label)}
			<div class="grouped-row field-row">
				<dt class="grouped-sub">{field.label}</dt>
				<dd>{field.value}</dd>
			</div>
		{/each}
	</dl>
{/if}

<style>
	.public-fields {
		margin: 0;
	}

	.field-row {
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		padding-top: 10px;
		padding-bottom: 10px;
	}

	.field-row + .field-row {
		border-top: var(--hairline) solid var(--colour-separator);
	}

	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
</style>
