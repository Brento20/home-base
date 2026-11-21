<script lang="ts">
	/**
	 * Appearance, on Edit your profile, laid out like the iPhone's Settings: Light or Dark as two
	 * little screens with a tick underneath, then a grouped list with a row for each part of the
	 * day. A row shows the theme it wears; tapping it opens a sheet of themes to pick from. Every
	 * pick saves at once (theme.ts) and repaints, showing that part of the day while you choose;
	 * leaving the page puts the real time back.
	 */
	import { onDestroy, onMount } from 'svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import Sheet from '#lib/ui/Sheet.svelte';
	import { applyDaypart, currentDaypart, type Daypart } from '#lib/ui/daypart.js';
	import {
		DEFAULT_THEME,
		PALETTES,
		saveTheme,
		themeFromCookies,
		type Mode,
		type Palette,
		type ThemeChoice
	} from '#lib/ui/theme.js';

	const PARTS: { key: Daypart; name: string; hours: string }[] = [
		{ key: 'morning', name: 'Morning', hours: '5 to 11 am' },
		{ key: 'day', name: 'Day', hours: '11 am to 5 pm' },
		{ key: 'evening', name: 'Evening', hours: '5 pm to 5 am' }
	];

	let theme = $state<ThemeChoice>({ ...DEFAULT_THEME });
	let now = $state<Daypart>('evening');
	// The part of the day whose sheet is open, if any.
	let picking = $state<Daypart | null>(null);

	onMount(() => {
		theme = themeFromCookies(document.cookie);
		now = currentDaypart();
	});

	// Leaving the page puts the real time of day back.
	onDestroy(() => {
		if (typeof document !== 'undefined') applyDaypart();
	});

	const paletteOf = (id: string) => PALETTES.find((palette) => palette.id === id) ?? PALETTES[0];
	const partOf = (key: Daypart) => PARTS.find((part) => part.key === key)!;

	function setMode(mode: Mode) {
		theme = { ...theme, mode };
		saveTheme(theme, picking ?? now);
	}

	// Opening a part of the day shows it behind the sheet, so you see what you're choosing.
	function open(part: Daypart) {
		picking = part;
		saveTheme(theme, part);
	}

	function pick(id: string) {
		if (!picking) return;
		theme = { ...theme, [picking]: id };
		saveTheme(theme, picking);
	}

	function close() {
		picking = null;
		saveTheme(theme, now);
	}

	// A swatch: the theme's glows over its ground, in the mode you're in.
	function swatch(palette: Palette, mode: Mode) {
		const { ground, glows } = palette[mode];
		return `background: radial-gradient(70% 60% at 75% 20%, ${glows[0]}, transparent 75%), radial-gradient(70% 60% at 15% 85%, ${glows[1]}, transparent 75%), ${ground}; --swatch-accent: ${palette[mode].accent}`;
	}

	const ember = paletteOf('ember');
</script>

<section class="appearance" aria-labelledby="appearance-heading">
	<h2 id="appearance-heading" class="section-label caption-label">Appearance</h2>

	<div class="modes" role="radiogroup" aria-label="Light or dark">
		{#each ['light', 'dark'] as const as mode (mode)}
			<label class="mode" class:on={theme.mode === mode}>
				<input
					class="hidden-input"
					type="radio"
					name="appearance-mode"
					value={mode}
					checked={theme.mode === mode}
					onchange={() => setMode(mode)}
				/>
				<span class="mode-preview" style={swatch(ember, mode)} aria-hidden="true">
					<span class="mini-card" class:light={mode === 'light'}>
						<span class="mini-line long"></span>
						<span class="mini-line"></span>
					</span>
				</span>
				<span class="mode-name">{mode === 'dark' ? 'Dark' : 'Light'}</span>
				<!-- The tick under each, as in the iPhone's Display settings. -->
				<span class="tick" aria-hidden="true"
					>{#if theme.mode === mode}<Icon name="check" size={14} />{/if}</span
				>
			</label>
		{/each}
	</div>

	<h3 class="section-label caption-label">Background through the day</h3>
	<ul class="group">
		{#each PARTS as part (part.key)}
			{@const palette = paletteOf(theme[part.key])}
			<li>
				<button
					type="button"
					class="row"
					onclick={() => open(part.key)}
					aria-label="{part.name}, {part.hours}: {palette.name}. Change"
				>
					<span class="row-text">
						<span class="row-name">
							{part.name}
							{#if part.key === now}<span class="now">Now</span>{/if}
						</span>
						<span class="row-hours">{part.hours}</span>
					</span>
					<span class="row-value">
						<span class="dot" style={swatch(palette, theme.mode)}></span>
						{palette.name}
					</span>
					<Icon name="chevron" size={16} />
				</button>
			</li>
		{/each}
	</ul>
	<p class="footnote">Changes show straight away, and follow you to any phone you sign in on.</p>
</section>

<Sheet
	open={picking !== null}
	title={picking ? `${partOf(picking).name} background` : 'Background'}
	onclose={close}
>
	{#if picking}
		{@const part = picking}
		<div class="swatches" role="radiogroup" aria-label="{partOf(part).name} background">
			{#each PALETTES as palette (palette.id)}
				<label class="swatch" class:on={theme[part] === palette.id}>
					<input
						class="hidden-input"
						type="radio"
						name="appearance-{part}"
						value={palette.id}
						checked={theme[part] === palette.id}
						onchange={() => pick(palette.id)}
					/>
					<span class="swatch-colour" style={swatch(palette, theme.mode)} aria-hidden="true"></span>
					<span class="swatch-name">{palette.name}</span>
				</label>
			{/each}
		</div>
		<p class="sheet-note">{partOf(part).hours}. Showing it now so you can see.</p>
		<div class="form-actions">
			<button type="button" class="button-primary" onclick={close}>Done</button>
		</div>
	{/if}
</Sheet>

<style>
	.appearance {
		margin-top: var(--space-2xl);
	}

	.section-label {
		margin: 0 0 10px 4px;
	}

	h3.section-label {
		margin-top: var(--space-xl);
	}

	/* Light or Dark: two little screens side by side. */
	.modes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-l);
		padding: 0 var(--space-m);
	}

	.mode {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}

	.mode-preview {
		display: grid;
		place-items: center;
		width: 100%;
		aspect-ratio: 5 / 4;
		border-radius: 18px;
		box-shadow: inset 0 0 0 1px var(--colour-hairline-strong);
	}

	.mode:has(input:focus-visible) .mode-preview {
		outline: 2px solid var(--colour-accent);
		outline-offset: 4px;
	}

	.mini-card {
		display: flex;
		flex-direction: column;
		gap: 5px;
		width: 62%;
		padding: 10px;
		border-radius: 10px;
		background: rgb(18 14 12 / 0.56);
		box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.1);
	}

	.mini-card.light {
		background: rgb(255 253 250 / 0.6);
		box-shadow: inset 0 0 0 1px rgb(31 24 19 / 0.08);
	}

	.mini-line {
		height: 5px;
		width: 55%;
		border-radius: 3px;
		background: rgb(245 237 230 / 0.5);
	}

	.mini-line.long {
		width: 85%;
		background: rgb(245 237 230 / 0.85);
	}

	.light .mini-line {
		background: rgb(31 24 19 / 0.35);
	}

	.light .mini-line.long {
		background: rgb(31 24 19 / 0.75);
	}

	.mode-name {
		font-size: var(--text-small);
	}

	.tick {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1.5px var(--colour-text-faint);
		color: var(--colour-on-accent);
	}

	.mode.on .tick {
		background: var(--colour-accent);
		box-shadow: none;
	}

	/* A grouped list, as in Settings: one card, rows split by hairlines. */
	.group {
		margin: 0;
		padding: 0;
		border-radius: 18px;
		background: var(--glass-body);
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline),
			var(--glass-highlight);
		list-style: none;
		overflow: hidden;
	}

	.group li + li .row {
		box-shadow: inset 0 1px 0 var(--colour-hairline);
	}

	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 60px;
		padding: 8px 14px 8px 16px;
		border: 0;
		background: none;
		color: var(--colour-text);
		font: inherit;
		text-align: left;
	}

	.row:global([data-pressed]),
	.row:active {
		background-color: var(--colour-press);
	}

	.row > :global(svg) {
		flex: none;
		color: var(--colour-text-faint);
	}

	.row-text {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
	}

	.row-name {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: var(--text-body);
	}

	.row-hours {
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}

	.now {
		padding: 1px 7px;
		border-radius: var(--radius-pill);
		background: var(--colour-accent-soft);
		color: var(--colour-accent);
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
	}

	.row-value {
		display: flex;
		flex: none;
		align-items: center;
		gap: 8px;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.dot {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1px var(--colour-hairline-strong);
	}

	.footnote {
		margin: 10px 4px 0;
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}

	/* The sheet: every theme in a grid that fits any phone. */
	.swatches {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-m) var(--space-s);
		margin-top: var(--space-s);
	}

	.swatch {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}

	.swatch-colour {
		position: relative;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1px var(--colour-hairline-strong);
	}

	/* The theme's accent as a dot, so you can see what the buttons will be. */
	.swatch-colour::after {
		content: '';
		position: absolute;
		right: 7px;
		bottom: 7px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--swatch-accent);
	}

	.swatch.on .swatch-colour {
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline-strong),
			0 0 0 2px var(--colour-ground),
			0 0 0 4px var(--colour-accent);
	}

	.swatch:has(input:focus-visible) .swatch-colour {
		outline: 2px solid var(--colour-accent);
		outline-offset: 6px;
	}

	.swatch-name {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.swatch.on .swatch-name {
		color: var(--colour-text);
		font-weight: var(--weight-medium);
	}

	.sheet-note {
		margin: var(--space-l) 0 0;
		font-size: var(--text-caption);
		color: var(--colour-text-faint);
	}
</style>
