<script lang="ts">
	import { enhance } from '$app/forms';
	import { save } from '#lib/ui/save.svelte.js';
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import GlassCard from '#lib/ui/GlassCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	const opening = save();

	// A fresh way of asking each visit (src/lib/copy/voice.ts).
	const heading = pick(HEADINGS.joinHome);
</script>

<svelte:head>
	<title>Join a home · home base</title>
</svelte:head>

<SoloScreen
	title={heading}
	lead="Ask someone in the home to send you an invite link. Open it on this phone, or paste it here."
>
	{#snippet top()}
		<a class="button-quiet" href="/setup"><Icon name="back" size={18} /> Back</a>
	{/snippet}

	<GlassCard>
		<form novalidate method="POST" class="form-stack" use:enhance={opening.enhance}>
			<label class="field">
				<span class="field-label">Invite link</span>
				<input
					class="field-input"
					name="link"
					value={form?.link ?? ''}
					inputmode="url"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					placeholder="https://…/join/…"
					required
					aria-invalid={form?.errors?.link ? 'true' : undefined}
				/>
				{#if form?.errors?.link}<span class="field-error">{form.errors.link}</span>{/if}
			</label>
			<button class="button-primary" disabled={opening.busy}
				>{opening.busy ? 'Opening…' : 'Open invite'}</button
			>
		</form>
	</GlassCard>
</SoloScreen>
