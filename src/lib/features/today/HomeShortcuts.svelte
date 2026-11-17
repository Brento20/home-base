<script lang="ts">
	/** Lights and aircon shortcuts on Today. Sample state until Home Assistant is connected. */
	import { goto } from '$app/navigation';
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';

	// Sample state until Home Assistant is connected (step 7).
	let lightsOn = $state(false);
	const aircon = { temperature: 23, mode: 'Cooling' };

	const HOLD_MS = 500;
	let holdTimer: ReturnType<typeof setTimeout> | undefined;
	let held = false;

	// Tap toggles; press and hold opens the device in the Home tab.
	function startHold() {
		held = false;
		holdTimer = setTimeout(() => {
			held = true;
			navigator.vibrate?.(10);
			goto('/home');
		}, HOLD_MS);
	}

	function cancelHold() {
		clearTimeout(holdTimer);
	}

	function tapLights() {
		if (held) return;
		lightsOn = !lightsOn;
	}
</script>

<div class="shortcuts" aria-label="Home shortcuts" role="group">
	<button
		type="button"
		class="tile"
		class:on={lightsOn}
		aria-pressed={lightsOn}
		onclick={tapLights}
		onpointerdown={startHold}
		onpointerup={cancelHold}
		onpointerleave={cancelHold}
		onpointercancel={cancelHold}
		oncontextmenu={(event) => event.preventDefault()}
	>
		<GlassSurface radius={24} refraction={28} squish />
		<span class="tile-body">
			<span class="icon"><Icon name="lightbulb" size={24} filled={lightsOn} /></span>
			<span>
				<span class="label">Lights</span>
				<span class="state">{lightsOn ? 'On' : 'Off'}</span>
			</span>
		</span>
	</button>

	<button
		type="button"
		class="tile"
		onclick={() => !held && goto('/home')}
		onpointerdown={startHold}
		onpointerup={cancelHold}
		onpointerleave={cancelHold}
		onpointercancel={cancelHold}
		oncontextmenu={(event) => event.preventDefault()}
	>
		<GlassSurface radius={24} refraction={28} squish />
		<span class="tile-body">
			<span class="top-row">
				<span class="icon"><Icon name="snowflake" size={24} /></span>
				<span class="value">{aircon.temperature}°</span>
			</span>
			<span>
				<span class="label">Aircon</span>
				<span class="state">{aircon.mode}</span>
			</span>
		</span>
	</button>
</div>

<style>
	.shortcuts {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.tile {
		position: relative;
		height: 108px;
		padding: 0;
		border: 0;
		border-radius: var(--radius-tile);
		background: none;
		text-align: left;
		-webkit-touch-callout: none;
		user-select: none;
		transition: box-shadow var(--duration-settle) var(--ease-out);
	}

	.tile-body {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: 100%;
		padding: 16px 18px;
		border-radius: inherit;
		box-shadow: inset 0 0 0 1px var(--colour-hairline);
		transition: background-color var(--duration-settle) var(--ease-out);
	}

	.tile:active .tile-body {
		background-color: rgb(255 255 255 / 0.04);
	}

	.on {
		box-shadow: 0 14px 40px -14px rgb(240 140 60 / 0.6);
	}

	.on .tile-body {
		background: linear-gradient(160deg, rgb(246 170 104 / 0.3), rgb(246 170 104 / 0.1));
		box-shadow: inset 0 0 0 1px rgb(255 190 140 / 0.32);
	}

	.icon {
		color: var(--colour-text-muted);
	}

	.on .icon {
		color: #f6b37a;
	}

	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.value {
		font-size: var(--text-control-value);
		line-height: 1;
		font-weight: var(--weight-medium);
		letter-spacing: -0.02em;
	}

	.label {
		display: block;
		font-size: 1rem;
		font-weight: var(--weight-medium);
	}

	.state {
		display: block;
		margin-top: 2px;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}
</style>
