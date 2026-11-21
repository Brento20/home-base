<script lang="ts">
	/**
	 * The home's Wi-Fi, from the note called "Wi-Fi": the network at a glance, and Share opens a
	 * sheet with a QR code a guest's camera can join from (the way iOS shares a network), plus the
	 * password to copy. The QR library loads only when the sheet first opens.
	 */
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import Sheet from '#lib/ui/Sheet.svelte';
	import { wifiQrText, type WifiDetails } from './house-info.js';

	interface Props {
		wifi: WifiDetails;
	}

	let { wifi }: Props = $props();

	let open = $state(false);
	let qr = $state('');
	let revealed = $state(false);
	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function share() {
		open = true;
		revealed = !wifi.isSecret;
		const { renderSVG } = await import('uqr');
		// Dark on white whatever the theme: cameras read that best.
		qr = renderSVG(wifiQrText(wifi), { border: 2, ecc: 'M' });
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(wifi.password);
			copied = true;
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 1800);
		} catch {
			revealed = true;
		}
	}
</script>

<div class="wifi">
	<GlassSurface radius={22} />
	<div class="row">
		<span class="glyph"><Icon name="wifi" size={22} /></span>
		<span class="text">
			<span class="label">Wi-Fi</span>
			<span class="network">{wifi.network}</span>
		</span>
		<button type="button" class="share" onclick={share}>
			<Icon name="qr" size={18} /> Share
		</button>
	</div>
</div>

<Sheet {open} title="Join {wifi.network}" onclose={() => (open = false)}>
	<div class="sheet">
		<div class="code" aria-label="QR code to join {wifi.network}" role="img">
			{#if qr}
				<!-- uqr's own SVG: rectangles only, built from the network name and password. -->
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html qr}
			{/if}
		</div>
		<p class="hint">Point a phone’s camera at the code to join.</p>

		<dl class="details">
			<div>
				<dt>Network</dt>
				<dd>{wifi.network}</dd>
			</div>
			{#if wifi.password}
				<div>
					<dt>Password</dt>
					<dd class="password">
						<span class:dots={!revealed}>{revealed ? wifi.password : '••••••••••'}</span>
						{#if wifi.isSecret}
							<button type="button" class="action" onclick={() => (revealed = !revealed)}
								>{revealed ? 'Hide' : 'Show'}</button
							>
						{/if}
						<button type="button" class="action" onclick={copy} aria-live="polite"
							>{copied ? 'Copied' : 'Copy'}</button
						>
					</dd>
				</div>
			{/if}
		</dl>

		<a class="edit" href="/home/notes/{wifi.noteId}">Edit Wi-Fi details</a>
	</div>
</Sheet>

<style>
	.wifi {
		position: relative;
		border-radius: 22px;
	}

	.row {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px 12px 12px 14px;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline),
			var(--glass-highlight);
	}

	.glyph {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		flex: none;
		border-radius: 12px;
		background: var(--colour-accent-soft);
		color: var(--colour-accent);
	}

	.text {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
	}

	.label {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.network {
		overflow: hidden;
		font-weight: var(--weight-medium);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.share {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 40px;
		padding: 0 14px;
		border: 0;
		border-radius: 999px;
		background: var(--colour-fill-strong);
		font: inherit;
		font-size: var(--text-small);
		font-weight: var(--weight-medium);
		color: var(--colour-text);
	}

	.share:active {
		background: var(--colour-press);
	}

	.sheet {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-bottom: var(--space-m);
	}

	.code {
		width: min(220px, 62vw);
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: 18px;
		background: white;
	}

	.code :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}

	.hint {
		margin-top: var(--space-s);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.details {
		align-self: stretch;
		margin: var(--space-l) 0 0;
		border-radius: 14px;
		background: var(--colour-fill);
	}

	.details > div {
		display: flex;
		align-items: center;
		gap: var(--space-s);
		min-height: 50px;
		padding: 0 16px;
	}

	.details > div + div {
		box-shadow: inset 0 1px var(--colour-hairline);
	}

	dt {
		width: 84px;
		flex: none;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	dd {
		flex: 1;
		min-width: 0;
		margin: 0;
		overflow-wrap: anywhere;
	}

	.password {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.password > span {
		flex: 1;
		font-variant-numeric: tabular-nums;
	}

	.dots {
		letter-spacing: 0.1em;
	}

	.action {
		min-height: 40px;
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		font-size: var(--text-small);
		color: var(--colour-accent);
	}

	.edit {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-target);
		margin-top: var(--space-s);
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}
</style>
