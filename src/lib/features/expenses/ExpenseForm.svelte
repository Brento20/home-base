<script lang="ts">
	import { PLACEHOLDERS } from '#lib/copy/voice.js';
	import { placeholderReel } from '#lib/ui/placeholder-reel.js';
	/**
	 * Add or edit an expense in the order you'd say it: how much, what for, who paid and how it's
	 * divided. Underneath, the result reads like the balance does ("Chris will owe you $10.00"),
	 * worked out with the same split code the server checks with.
	 *
	 * The rest is edited down to one row of chips, each showing what it's set to: the category
	 * (guessed from what it was for as you type, on a new expense), the day ("Today") and
	 * "+ Repeat". Tap one to change it. Chips are labels of hidden checkboxes and CSS shows the
	 * field (forms.css), so it works before any script loads; closed fields still post.
	 */
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { save } from '#lib/ui/save.svelte.js';
	import Avatar from '#lib/ui/Avatar.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import SaveDock from '#lib/ui/SaveDock.svelte';
	import { formatDayLabel } from '#lib/time.js';
	import type { FieldErrors, Profile } from '#lib/types.js';
	import { CATEGORIES, categoryColour, categoryLabel, guessCategory } from './categories.js';
	import { nameOf } from './describe.js';
	import type { ExpenseField, ExpenseFormValues } from './form.js';
	import { currencySymbol, formatMoney, parseMoney } from './money.js';
	import {
		computeShares,
		NO_AMOUNT,
		readSplitInput,
		SPLIT_METHODS,
		type SplitMethod
	} from './split.js';
	import { FREQUENCIES, type Frequency } from './recurring.js';

	interface Props {
		values: ExpenseFormValues;
		errors?: FieldErrors<ExpenseField>;
		/** Everyone in the group, in the order they joined. */
		people: Profile[];
		me: string;
		action: string;
		submitLabel: string;
		/**
		 * Recurring bills: offer "Repeats" (Never, then weekly to yearly) and start on this. A
		 * recurring bill's own page sets `repeatOnly`, so it always repeats and its date is the
		 * next bill.
		 */
		repeat?: Frequency | 'none';
		showRepeat?: boolean;
		repeatOnly?: boolean;
	}

	let {
		values,
		errors = {},
		people,
		me,
		action,
		submitLabel,
		repeat: startRepeat = 'none',
		showRepeat = false,
		repeatOnly = false
	}: Props = $props();
	let repeat = $state<Frequency | 'none'>(untrack(() => startRepeat));
	const every = $derived(FREQUENCIES.find((entry) => entry.value === repeat)?.every);

	// The form keeps its own copy of every field. The live result re-renders on each keystroke,
	// and fields bound to their own state keep what was typed through those re-renders.
	let paidBy = $state(untrack(() => values.paidBy));
	let amount = $state(untrack(() => values.amount));
	let method = $state<SplitMethod>(untrack(() => values.splitMethod));
	let included = $state<string[]>(untrack(() => [...values.included]));
	let inputs = $state<Record<string, string>>(untrack(() => ({ ...values.inputs })));
	let description = $state(untrack(() => values.description));
	let category = $state(untrack(() => values.category));
	let spentOn = $state(untrack(() => values.spentOn));
	const saving = save();

	// A new expense (nothing typed yet) guesses its category from what it was for, until you
	// pick one yourself. An edit, or a receipt fill, keeps the category it came with.
	const guessing = untrack(() => !values.description && !repeatOnly);
	const startCategory = untrack(() => values.category);
	let picked = $state(false);
	$effect(() => {
		if (!guessing || picked) return;
		category = guessCategory(description) ?? startCategory;
	});

	// Open from the start only when there's something to fix there.
	const dateOpen = untrack(() => Boolean(errors.spentOn));
	const repeatOpen = untrack(() => startRepeat !== 'none');

	const totalCents = $derived(parseMoney(amount) ?? 0);
	const ordered = $derived(people.filter((person) => included.includes(person.id)));

	const preview = $derived(
		computeShares(
			totalCents,
			method,
			ordered.map((person) => ({
				profileId: person.id,
				input: readSplitInput(method, inputs[person.id] ?? '')
			}))
		)
	);

	const owedBy = (id: string) => preview.shares.find((share) => share.profileId === id)?.owedCents;
	const label = (id: string) => (id === me ? 'You' : nameOf(people, id, me));

	/**
	 * What saving this will do, one line per person who owes the payer something:
	 * "Chris will owe you $10.00", "You'll owe Brenton $12.50", "Sam will owe Brenton $5.00".
	 */
	const result = $derived.by(() => {
		if (!preview.ok) return [];
		return preview.shares
			.filter((share) => share.profileId !== paidBy && share.owedCents > 0)
			.map((share) => {
				const owes = share.profileId === me ? 'You’ll owe' : `${label(share.profileId)} will owe`;
				const to = paidBy === me ? 'you' : label(paidBy);
				return `${owes} ${to} ${formatMoney(share.owedCents)}`;
			});
	});

	/** Switching how it's divided starts everyone at an even split in the new terms. */
	function switchMethod(next: SplitMethod) {
		method = next;
		if (next === 'equal' || ordered.length === 0) return;
		// Even parts of a whole: of the total in cents, or of 100.00% in hundredths.
		const evenParts = (whole: number) =>
			computeShares(
				whole,
				'equal',
				ordered.map((person) => ({ profileId: person.id, input: 0 }))
			).shares.map((share) => share.owedCents);
		const percents = evenParts(10000);
		const amounts = evenParts(totalCents);
		for (const [index, person] of ordered.entries()) {
			inputs[person.id] =
				next === 'percent'
					? String(percents[index] / 100)
					: totalCents
						? (amounts[index] / 100).toFixed(2)
						: '';
		}
	}
</script>

<form
	novalidate
	method="POST"
	{action}
	class="form-stack docked expense-form"
	use:enhance={saving.enhance}
>
	<label class="field">
		<span class="field-label">Total paid</span>
		<span class="money-input total">
			<span class="currency" aria-hidden="true">{currencySymbol()}</span>
			<input
				id="expense-amount"
				class="field-input"
				name="amount"
				inputmode="decimal"
				autocomplete="off"
				placeholder="0.00"
				bind:value={amount}
				required
				aria-invalid={errors.amount ? 'true' : undefined}
			/>
		</span>
		{#if errors.amount}<span class="field-error">{errors.amount}</span>{/if}
	</label>

	<label class="field">
		<span class="field-label">What was it for?</span>
		<input
			class="field-input"
			name="description"
			bind:value={description}
			maxlength="80"
			placeholder={PLACEHOLDERS.expense[0]}
			use:placeholderReel={PLACEHOLDERS.expense}
			required
			aria-invalid={errors.description ? 'true' : undefined}
		/>
		{#if errors.description}<span class="field-error">{errors.description}</span>{/if}
	</label>

	<fieldset class="field">
		<legend class="field-label">Who paid</legend>
		<div class="choice-pills">
			{#each people as person (person.id)}
				<label class="choice-pill">
					<input type="radio" name="paidBy" value={person.id} bind:group={paidBy} />
					<Avatar {person} size={22} dot />
					{label(person.id)}
				</label>
			{/each}
		</div>
		{#if errors.paidBy}<span class="field-error">{errors.paidBy}</span>{/if}
	</fieldset>

	<fieldset class="field">
		<legend class="field-label">How it’s divided</legend>
		<div class="choice-pills" role="radiogroup" aria-label="How it’s divided">
			{#each SPLIT_METHODS as option (option.key)}
				<label class="choice-pill">
					<input
						type="radio"
						name="splitMethod"
						value={option.key}
						checked={method === option.key}
						onchange={() => switchMethod(option.key)}
					/>
					{option.label}
				</label>
			{/each}
		</div>

		<ul class="people">
			{#each people as person (person.id)}
				{@const isIn = included.includes(person.id)}
				{@const owed = owedBy(person.id)}
				<li class:out={!isIn}>
					<label class="who">
						<input
							class="hidden-input"
							type="checkbox"
							name="included"
							value={person.id}
							bind:group={included}
						/>
						<span class="tick" aria-hidden="true"></span>
						<Avatar {person} size={30} />
						<span class="one-line">{label(person.id)}</span>
					</label>
					{#if isIn && method !== 'equal'}
						<span class="mini">
							{#if method === 'exact'}<span class="mini-unit">$</span>{/if}
							<input
								name="input-{person.id}"
								inputmode="decimal"
								autocomplete="off"
								aria-label="{method === 'exact' ? 'Amount' : 'Percent'} for {person.displayName}"
								bind:value={inputs[person.id]}
							/>
							{#if method === 'percent'}<span class="mini-unit">%</span>{/if}
						</span>
					{/if}
					<span class="owed">{isIn && owed !== undefined ? formatMoney(owed) : ''}</span>
				</li>
			{/each}
		</ul>

		<div class="result" aria-live="polite">
			{#if !preview.ok}
				<!-- No amount yet is where everyone starts: say so quietly, not as a problem. -->
				<p class:problem={preview.message !== NO_AMOUNT} class:hint={preview.message === NO_AMOUNT}>
					{preview.message}
				</p>
			{:else if result.length === 0}
				<p>Nobody owes anything for this one.</p>
			{:else}
				{#each result as line (line)}<p>{line}</p>{/each}
			{/if}
			{#if errors.split && preview.ok}<p class="problem">{errors.split}</p>{/if}
		</div>
	</fieldset>

	<fieldset class="field extra category">
		<legend class="field-label">Category</legend>
		<div class="choice-pills">
			{#each CATEGORIES as option (option.key)}
				<label class="choice-pill">
					<input
						type="radio"
						name="category"
						value={option.key}
						bind:group={category}
						onchange={() => (picked = true)}
					/>
					<span class="swatch" style:--swatch={option.colour}></span>
					{option.label}
				</label>
			{/each}
		</div>
	</fieldset>

	<label class="field date" class:extra={!repeatOnly}>
		<span class="field-label">{repeatOnly ? 'Next bill' : 'Date'}</span>
		<input
			class="field-input"
			name="spentOn"
			type="date"
			bind:value={spentOn}
			required
			aria-invalid={errors.spentOn ? 'true' : undefined}
		/>
		{#if errors.spentOn}<span class="field-error">{errors.spentOn}</span>{/if}
	</label>

	{#if showRepeat || repeatOnly}
		<fieldset class="field repeat" class:extra={!repeatOnly}>
			<legend class="field-label">Repeats</legend>
			<div class="choice-pills">
				{#if !repeatOnly}
					<label class="choice-pill">
						<input type="radio" name="repeat" value="none" bind:group={repeat} />
						Never
					</label>
				{/if}
				{#each FREQUENCIES as option (option.value)}
					<label class="choice-pill">
						<input type="radio" name="repeat" value={option.value} bind:group={repeat} />
						{option.label}
					</label>
				{/each}
			</div>
			{#if every}
				<span class="field-hint"
					>Adds itself {every} from {repeatOnly ? 'the next bill' : 'this date'}, paid and split the
					same way. You can pause or stop it any time.</span
				>
			{/if}
		</fieldset>
	{/if}

	<!-- No name on these: they only show and hide fields, and aren't sent with the form. -->
	<div class="extras">
		<input class="extra-toggle" type="checkbox" id="expense-pick-category" />
		<label class="extra-chip" for="expense-pick-category">
			<span class="swatch" style:--swatch={categoryColour(category)}></span>
			{categoryLabel(category)}
		</label>
		{#if !repeatOnly}
			<input class="extra-toggle" type="checkbox" id="expense-pick-date" checked={dateOpen} />
			<label class="extra-chip" for="expense-pick-date">
				<Icon name="calendar" size={16} />
				{spentOn ? formatDayLabel(spentOn) : 'Date'}
			</label>
		{/if}
		{#if showRepeat && !repeatOnly}
			<input class="extra-toggle" type="checkbox" id="expense-pick-repeat" checked={repeatOpen} />
			<label class="extra-chip" for="expense-pick-repeat"
				><Icon name="plus" size={16} /> Repeat</label
			>
		{/if}
	</div>

	<SaveDock label={submitLabel} saving={saving.busy} />
</form>

<style>
	/* Tucked until their chip is tapped (chip styles: forms.css). A chip can't be closed again,
	   as on the task form. */
	:global(.expense-form:has(#expense-pick-category:not(:checked)) .category),
	:global(.expense-form:has(#expense-pick-date:not(:checked)) .date),
	:global(.expense-form:has(#expense-pick-repeat:not(:checked)) .repeat) {
		display: none;
	}

	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--swatch);
	}

	.people {
		display: flex;
		flex-direction: column;
		margin: var(--space-s) 0 0;
		padding: 0;
		list-style: none;
	}

	.people li {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 56px;
		border-bottom: var(--hairline) solid var(--colour-separator);
		transition: opacity var(--duration-quick) var(--ease-out);
	}

	.people li.out {
		opacity: 0.5;
	}

	.who {
		position: relative;
		display: flex;
		flex: 1;
		align-items: center;
		gap: 10px;
		min-width: 0;
		min-height: 48px;
		cursor: pointer;
	}

	/* A ring that fills when the person is included. */
	.tick {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		flex: none;
		border: 1.5px solid var(--colour-hairline-strong);
		border-radius: 50%;
		transition:
			background-color var(--duration-quick) var(--ease-out),
			border-color var(--duration-quick) var(--ease-out);
	}

	.who input:checked + .tick {
		border-color: var(--colour-accent);
		background: var(--colour-accent);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231a0f08' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E");
		background-size: 14px;
		background-position: center;
		background-repeat: no-repeat;
	}

	.who input:focus-visible + .tick {
		outline: 2px solid var(--colour-accent);
		outline-offset: 2px;
	}

	.mini {
		display: flex;
		align-items: center;
		gap: 4px;
		height: 38px;
		padding: 0 10px;
		border: var(--hairline) solid var(--colour-separator-strong);
		border-radius: 12px;
		background: var(--colour-well);
	}

	.mini:focus-within {
		border-color: var(--colour-accent-edge);
		box-shadow: 0 0 0 3px var(--colour-accent-soft);
	}

	.mini input {
		width: 56px;
		border: 0;
		background: none;
		font-size: var(--text-small);
		font-variant-numeric: tabular-nums;
		color: var(--colour-text);
		text-align: right;
	}

	.mini input:focus {
		outline: none;
	}

	.mini-unit {
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}

	.owed {
		width: 80px;
		flex: none;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	/* The total is the number that matters most, so it reads largest. */
	.total .field-input {
		min-height: 64px;
		padding-left: 34px;
		font-size: var(--text-control-value);
		font-weight: var(--weight-strong);
	}

	.total .currency {
		left: 16px;
		font-size: 1.25rem;
	}

	.result {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-top: var(--space-m);
		padding: 12px 16px;
		border-radius: 14px;
		background: var(--colour-accent-soft);
		font-size: var(--text-small);
		font-weight: var(--weight-medium);
	}

	.result .problem {
		color: var(--colour-accent);
	}

	.result .hint {
		color: var(--colour-text-muted);
	}

	.date {
		max-width: 220px;
	}
</style>
