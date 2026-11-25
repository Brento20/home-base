<script lang="ts">
	/**
	 * A button that picks a photo and saves it straight away, with no form to fill: the phone's
	 * own picker (Take Photo, Photo Library) opens, the photo is shrunk in the browser
	 * (src/lib/ui/photo.ts) and posted to `action` (a recipe page's ?/photo). Used on the recipe
	 * page and on "How was it?".
	 */
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { shrinkPhoto } from '#lib/ui/photo.js';

	interface Props {
		action: string;
		/** Read out for the button; the snippet is what shows. */
		label: string;
		class?: string;
		busy?: boolean;
		onsaved?: () => void;
		onproblem?: (message: string) => void;
		children: Snippet;
	}

	let {
		action,
		label,
		class: className = '',
		busy = $bindable(false),
		onsaved,
		onproblem,
		children
	}: Props = $props();

	let form = $state<HTMLFormElement>();
	let input = $state<HTMLInputElement>();
	let photo: File | null = null;

	async function choose() {
		const file = input?.files?.[0];
		if (!file) return;
		busy = true;
		try {
			photo = await shrinkPhoto(file);
		} catch {
			busy = false;
			onproblem?.('That photo couldn’t be read. Try a different one.');
			return;
		}
		form?.requestSubmit();
	}
</script>

<form
	bind:this={form}
	method="POST"
	{action}
	enctype="multipart/form-data"
	class="photo-upload"
	use:enhance={({ formData }) => {
		formData.delete('photo');
		if (photo) formData.set('photo', photo);
		return async ({ result, update }) => {
			await update({ reset: true, invalidateAll: true });
			busy = false;
			photo = null;
			if (result.type === 'success') onsaved?.();
			else if (result.type === 'failure')
				onproblem?.(String(result.data?.photoError ?? 'That photo didn’t save. Try again.'));
			else if (result.type === 'error') onproblem?.('That photo didn’t save. Try again.');
		};
	}}
>
	<label class="{className} pick" aria-label={label} aria-busy={busy}>
		{@render children()}
		<input
			bind:this={input}
			type="file"
			name="photo"
			accept="image/jpeg,image/png,image/webp,image/heic"
			disabled={busy}
			onchange={choose}
		/>
	</label>
</form>

<style>
	.photo-upload {
		display: contents;
	}

	.pick {
		position: relative;
		cursor: pointer;
	}

	.pick input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
	}

	.pick:has(input:focus-visible) {
		outline: 2px solid var(--colour-accent);
		outline-offset: 2px;
	}
</style>
