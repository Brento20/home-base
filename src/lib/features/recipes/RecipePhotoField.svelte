<script lang="ts">
	/**
	 * The photo slot at the top of the recipe form. Empty, it's one big "Add a photo"; with a
	 * photo, the photo, with Change and Remove on it. A photo chosen here is shrunk in the
	 * browser (src/lib/ui/photo.ts) and handed to the form as `photo`, which RecipeForm sends in
	 * place of the original. An imported one (a data URL from the recipe page) is adopted the same
	 * way, so saving the recipe keeps it and removing it here drops it.
	 */
	import { onMount, untrack } from 'svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { shrinkPhoto } from '#lib/ui/photo.js';

	interface Props {
		/** The photo it starts with: the recipe's own, or one brought in from a link. */
		current?: string | null;
		/** `current` is new (from a link or a form that bounced back) and goes with the save. */
		adopt?: boolean;
		error?: string;
		/** The file to send, once one is chosen or adopted. */
		photo?: File | null;
		/** The recipe's own photo was removed here. */
		removed?: boolean;
		reading?: boolean;
	}

	let {
		current = null,
		adopt = false,
		error,
		photo = $bindable(null),
		removed = $bindable(false),
		reading = $bindable(false)
	}: Props = $props();

	let preview = $state<string | null>(untrack(() => current));
	let problem = $state<string | null>(null);
	let input = $state<HTMLInputElement>();

	async function take(file: File) {
		problem = null;
		reading = true;
		try {
			photo = await shrinkPhoto(file);
			removed = false;
			if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
			preview = URL.createObjectURL(photo);
		} catch {
			problem = 'That photo couldn’t be read. Try a different one.';
		} finally {
			reading = false;
		}
	}

	/** A data URL as a file. Decoded by hand: the app's content policy won't fetch data: URLs. */
	function fileFrom(dataUrl: string) {
		const [head, body] = dataUrl.split(',', 2);
		const type = head.match(/^data:([^;]+)/)?.[1] ?? 'image/jpeg';
		const binary = atob(body);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return new File([bytes], 'photo', { type });
	}

	onMount(() => {
		if (!adopt || !current?.startsWith('data:')) return;
		try {
			take(fileFrom(current));
		} catch {
			preview = null;
		}
		return () => {
			if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
		};
	});

	function choose(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (file) take(file);
	}

	function remove() {
		if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
		preview = null;
		photo = null;
		removed = Boolean(current) && !adopt;
		if (input) input.value = '';
	}
</script>

<div class="field">
	<span class="field-label" id="recipe-photo-label">Photo</span>
	{#if preview}
		<div class="shot">
			<img src={preview} alt="The dish" />
			<div class="tools">
				<label class="tool">
					<Icon name="camera" size={16} />
					{reading ? 'Reading…' : 'Change'}
					<input
						bind:this={input}
						type="file"
						accept="image/jpeg,image/png,image/webp,image/heic"
						aria-labelledby="recipe-photo-label"
						onchange={choose}
					/>
				</label>
				<button type="button" class="tool" onclick={remove}>
					<Icon name="close" size={16} /> Remove
				</button>
			</div>
		</div>
	{:else}
		<label class="empty">
			<Icon name="camera" size={28} />
			<span class="empty-title">{reading ? 'Reading photo…' : 'Add a photo'}</span>
			<span class="empty-note">Or snap one next time you cook it</span>
			<input
				bind:this={input}
				type="file"
				accept="image/jpeg,image/png,image/webp,image/heic"
				aria-labelledby="recipe-photo-label"
				onchange={choose}
			/>
		</label>
	{/if}
	{#if problem ?? error}<span class="field-error">{problem ?? error}</span>{/if}
</div>

<style>
	.shot {
		position: relative;
		height: 200px;
		border-radius: var(--radius-tile);
		overflow: hidden;
		background: var(--colour-fill);
	}

	.shot img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.tools {
		position: absolute;
		right: 10px;
		bottom: 10px;
		display: flex;
		gap: 8px;
	}

	.tool {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: var(--tap-target);
		padding: 0 14px;
		border: 0;
		border-radius: var(--radius-pill);
		background: rgb(14 10 8 / 0.62);
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
		color: #fff;
		font: inherit;
		font-size: var(--text-caption);
		font-weight: 600;
		cursor: pointer;
	}

	.empty {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 168px;
		border-radius: var(--radius-tile);
		border: 1.5px dashed var(--colour-accent-edge);
		background: linear-gradient(150deg, var(--colour-accent-soft), transparent);
		color: var(--colour-accent);
		cursor: pointer;
		transition: opacity var(--duration-quick) var(--ease-out);
	}

	.empty:global([data-pressed]) {
		opacity: 0.6;
		transition-duration: var(--duration-press);
	}

	.empty-title {
		margin-top: 2px;
		font-weight: 600;
	}

	.empty-note {
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.empty input,
	.tool input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}

	.empty:has(input:focus-visible),
	.tool:has(input:focus-visible) {
		outline: 2px solid var(--colour-accent);
		outline-offset: 2px;
	}
</style>
