<script lang="ts">
	/**
	 * Shortcuts on Today: Plan dinner, which opens the recipe library (and says what's for
	 * dinner tonight once it's planned), and Post update, which opens the feed composer.
	 */
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';

	interface Props {
		/** Tonight's dinner, if one's planned. */
		tonight?: string | null;
	}

	let { tonight = null }: Props = $props();
</script>

<div class="shortcuts" aria-label="Home shortcuts" role="group">
	<a class="tile dinner" class:on={tonight} href="/dinner">
		<GlassSurface radius={24} squish />
		<span class="tile-body">
			<span class="icon"><Icon name="dinner" size={24} /></span>
			<span>
				<span class="label">Plan dinner</span>
				<span class="state">{tonight ? `Tonight: ${tonight}` : 'What’s cooking?'}</span>
			</span>
		</span>
	</a>

	<a class="tile compose" href="/feed/new">
		<GlassSurface radius={24} squish />
		<span class="tile-body">
			<span class="icon"><Icon name="compose" size={24} /></span>
			<span>
				<span class="label">Post update</span>
				<span class="state">Share with home</span>
			</span>
		</span>
	</a>
</div>

<style>
	.shortcuts {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.tile {
		position: relative;
		display: block;
		color: inherit;
		text-decoration: none;
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

	.tile:global([data-pressed]) .tile-body {
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

	.dinner .icon,
	.compose .icon {
		color: #f6b37a;
	}

	.label {
		display: block;
		font-size: 1rem;
		font-weight: var(--weight-medium);
	}

	.state {
		display: block;
		overflow: hidden;
		margin-top: 2px;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
