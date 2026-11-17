<script lang="ts">
	/** How often a chore comes back: once, weekly, every 2 weeks or monthly. */
	import { REPEATS, type Repeat } from './repeat.js';

	interface Props {
		value: Repeat;
	}

	let { value }: Props = $props();
</script>

<fieldset class="field">
	<legend class="field-label">Repeat</legend>
	<div class="choice-pills">
		{#each REPEATS as option (option.key)}
			<label class="choice-pill">
				<input type="radio" name="repeat" value={option.key} checked={value === option.key} />
				{option.label}
			</label>
		{/each}
	</div>
</fieldset>
