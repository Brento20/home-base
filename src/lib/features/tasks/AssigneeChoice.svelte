<script lang="ts">
	/** Who a task is for: anyone in the home, or one person. */
	import Avatar from '#lib/ui/Avatar.svelte';
	import type { Profile } from '#lib/types.js';

	interface Props {
		people: Profile[];
		/** Selected profile id, or '' for anyone. */
		value: string;
		error?: string;
		/** The question above the choices. */
		label?: string;
	}

	let { people, value, error, label = 'Who' }: Props = $props();
</script>

<fieldset class="field">
	<legend class="field-label">{label}</legend>
	<div class="choice-pills">
		<label class="choice-pill">
			<input type="radio" name="assigneeId" value="" checked={value === ''} />
			Anyone
		</label>
		{#each people as person (person.id)}
			<label class="choice-pill">
				<input type="radio" name="assigneeId" value={person.id} checked={value === person.id} />
				<Avatar {person} size={22} dot />
				{person.displayName}
			</label>
		{/each}
	</div>
	{#if error}<p class="field-error">{error}</p>{/if}
</fieldset>
