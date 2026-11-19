<script lang="ts">
	/**
	 * How often a chore comes back: once, weekly, every 2 weeks, monthly, or Custom, which shows
	 * "Every [3] [months]" for anything else (days, weeks, months or years). Read back with
	 * repeatFromForm in repeat.ts.
	 */
	import {
		isPreset,
		REPEAT_EVERY_MAX,
		REPEAT_UNITS,
		REPEATS,
		ruleOf,
		type Repeat
	} from './repeat.js';

	interface Props {
		value: Repeat;
	}

	let { value }: Props = $props();
	const custom = $derived(!isPreset(value));
	const rule = $derived(ruleOf(value));
</script>

<fieldset class="field repeat-choice">
	<legend class="field-label">Repeat</legend>
	<div class="choice-pills">
		{#each REPEATS as option (option.key)}
			<label class="choice-pill">
				<input type="radio" name="repeat" value={option.key} checked={value === option.key} />
				{option.label}
			</label>
		{/each}
		<label class="choice-pill">
			<input type="radio" name="repeat" value="custom" checked={custom} />
			Custom…
		</label>
	</div>

	<!-- Only while Custom is picked (CSS below). -->
	<div class="custom">
		<span>Every</span>
		<label class="visually-hidden" for="repeat-every">How many</label>
		<input
			id="repeat-every"
			class="field-input every"
			type="number"
			name="repeatEvery"
			inputmode="numeric"
			min="1"
			max={REPEAT_EVERY_MAX}
			value={custom && rule ? rule.every : 3}
		/>
		<label class="visually-hidden" for="repeat-unit">Days, weeks, months or years</label>
		<select id="repeat-unit" class="field-input unit" name="repeatUnit">
			{#each REPEAT_UNITS as unit (unit)}
				<option value={unit} selected={custom && rule ? rule.unit === unit : unit === 'months'}
					>{unit}</option
				>
			{/each}
		</select>
	</div>
</fieldset>

<style>
	.custom {
		display: none;
		align-items: center;
		gap: var(--space-s);
		margin-top: var(--space-s);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.repeat-choice:has(input[value='custom']:checked) .custom {
		display: flex;
	}

	.every {
		width: 76px;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.unit {
		width: auto;
		min-width: 120px;
	}
</style>
