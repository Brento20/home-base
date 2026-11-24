<script lang="ts">
	/**
	 * Display preferences on Preferences: a few independent ways to make home base calmer to look
	 * at, just for you. Appearance (glow, placeholders) and Today (summary line, how many cards,
	 * cards or a list). Each change shows straight away and saves itself
	 * (src/lib/display.svelte.ts); everyone else in the home keeps their own.
	 */
	import { CARD_LIMITS, type CardLimit, type DisplayPrefs } from '#lib/display.js';
	import { displayPrefs, setDisplay } from '#lib/display.svelte.js';

	interface Props {
		/** What the server sent with the page. */
		saved: DisplayPrefs;
	}

	let { saved }: Props = $props();
	const prefs = $derived(displayPrefs(saved));

	function change<K extends keyof DisplayPrefs>(key: K, value: DisplayPrefs[K]) {
		setDisplay({ ...prefs, [key]: value });
	}

	const LIMITS: { value: CardLimit; label: string }[] = [
		...CARD_LIMITS.map((value) => ({ value, label: String(value) })),
		{ value: 'all', label: 'All' }
	];
</script>

<section class="display" aria-labelledby="calmer-heading">
	<h2 id="calmer-heading" class="section-label caption-label">Calmer screens</h2>
	<ul class="grouped">
		<li>
			<label class="grouped-row switch-row">
				<span class="grouped-label"
					>Reduce glow effects<span class="grouped-sub"
						>A softer, still background and no glow behind cards</span
					></span
				>
				<input
					class="hidden-input"
					type="checkbox"
					role="switch"
					checked={prefs.reduceGlow}
					onchange={(event) => change('reduceGlow', event.currentTarget.checked)}
				/>
				<span class="switch" aria-hidden="true"></span>
			</label>
		</li>
		<li>
			<label class="grouped-row switch-row">
				<span class="grouped-label"
					>Steady placeholders<span class="grouped-sub"
						>Example text in fields and page headings stay the same</span
					></span
				>
				<input
					class="hidden-input"
					type="checkbox"
					role="switch"
					checked={prefs.staticPlaceholders}
					onchange={(event) => change('staticPlaceholders', event.currentTarget.checked)}
				/>
				<span class="switch" aria-hidden="true"></span>
			</label>
		</li>
	</ul>

	<h2 class="section-label caption-label today-label" id="today-heading">Today</h2>
	<ul class="grouped" aria-labelledby="today-heading">
		<li>
			<label class="grouped-row switch-row">
				<span class="grouped-label"
					>Daily summary<span class="grouped-sub">The line about your day under the date</span
					></span
				>
				<input
					class="hidden-input"
					type="checkbox"
					role="switch"
					checked={!prefs.hideDailySummary}
					onchange={(event) => change('hideDailySummary', !event.currentTarget.checked)}
				/>
				<span class="switch" aria-hidden="true"></span>
			</label>
		</li>
		<li class="grouped-row stacked">
			<span class="grouped-label" id="limit-label"
				>Cards shown<span class="grouped-sub">The rest are a tap away</span></span
			>
			<div class="segmented" role="radiogroup" aria-labelledby="limit-label">
				{#each LIMITS as option (option.value)}
					<label class:on={prefs.todayCardLimit === option.value}>
						<input
							class="hidden-input"
							type="radio"
							name="today-card-limit"
							checked={prefs.todayCardLimit === option.value}
							onchange={() => change('todayCardLimit', option.value)}
						/>
						{option.label}
					</label>
				{/each}
			</div>
		</li>
		<li class="grouped-row stacked">
			<span class="grouped-label" id="layout-label"
				>Layout<span class="grouped-sub">Big cards to swipe, or a compact list</span></span
			>
			<div class="segmented" role="radiogroup" aria-labelledby="layout-label">
				{#each [{ value: 'cards', label: 'Cards' }, { value: 'list', label: 'List' }] as const as option (option.value)}
					<label class:on={prefs.todayCardLayout === option.value}>
						<input
							class="hidden-input"
							type="radio"
							name="today-card-layout"
							checked={prefs.todayCardLayout === option.value}
							onchange={() => change('todayCardLayout', option.value)}
						/>
						{option.label}
					</label>
				{/each}
			</div>
		</li>
	</ul>
</section>

<style>
	.display {
		margin-top: var(--space-2xl);
	}

	.section-label {
		margin: 0 0 10px 4px;
	}

	.today-label {
		margin-top: var(--space-xl);
	}

	.switch-row {
		position: relative;
		cursor: pointer;
	}

	/* The iOS switch, as on a plan's "All day". */
	.switch {
		position: relative;
		flex: none;
		width: 50px;
		height: 30px;
		border-radius: var(--radius-pill);
		background: var(--colour-fill-strong);
		transition: background-color var(--duration-quick) var(--ease-out);
	}

	.switch::after {
		content: '';
		position: absolute;
		top: 3px;
		left: 3px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
		transition: transform var(--duration-settle) var(--ease-spring);
	}

	input:checked + .switch {
		background: var(--colour-accent);
	}

	input:checked + .switch::after {
		transform: translateX(20px);
	}

	input:focus-visible + .switch {
		outline: 2px solid var(--colour-accent);
		outline-offset: 2px;
	}

	/* A label above its segmented control, for the choices with more than two options. */
	.stacked {
		flex-direction: column;
		align-items: stretch;
		gap: 10px;
		padding-block: 12px;
	}

	/* iOS's segmented control: equal segments on a well, the chosen one raised. */
	.segmented {
		display: grid;
		grid-auto-columns: 1fr;
		grid-auto-flow: column;
		gap: 2px;
		padding: 2px;
		border-radius: 12px;
		background: var(--colour-fill);
	}

	.segmented label {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 36px;
		border-radius: 10px;
		font-size: var(--text-small);
		font-weight: var(--weight-medium);
		color: var(--colour-text-muted);
		cursor: pointer;
		transition:
			background-color var(--duration-quick) var(--ease-out),
			color var(--duration-quick) var(--ease-out);
	}

	/* The chosen segment: raised and lit, clear in light and dark. */
	.segmented label.on {
		background: var(--colour-fill-stronger);
		color: var(--colour-text);
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline-strong),
			0 1px 4px rgb(0 0 0 / 0.18);
	}

	.segmented label:has(input:focus-visible) {
		outline: 2px solid var(--colour-accent);
		outline-offset: 1px;
	}

	@media (prefers-reduced-motion: reduce) {
		.switch,
		.switch::after,
		.segmented label {
			transition: none;
		}
	}
</style>
