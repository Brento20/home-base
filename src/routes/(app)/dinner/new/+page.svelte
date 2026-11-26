<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import { BLANK_RECIPE_FORM } from '#lib/features/recipes/recipe.js';
	import RecipeForm from '#lib/features/recipes/RecipeForm.svelte';
	import AssistBox from '#lib/ui/AssistBox.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const heading = pick(HEADINGS.newRecipe);

	const FILLED_FROM = {
		link: 'Filled in from the link.',
		text: 'Filled in from what you pasted.',
		photo: 'Filled in from your photo.'
	};
	// When a site won't hand its page over, say so, and the two ways that always work.
	const failedNote = $derived.by(() => {
		const problem = form && 'problem' in form ? form.problem : null;
		const site = form && 'site' in form ? form.site : 'That site';
		if (problem === 'blocked')
			return `${site} wouldn’t let home base read the page (some sites turn apps away). Take a screenshot of the recipe and add it as a photo, or copy the recipe and paste it here.`;
		if (problem === 'unreachable')
			return `Couldn’t reach ${site} just now. Try again, or paste the recipe or a screenshot of it.`;
		if (problem === 'not-a-page')
			return 'That link isn’t a web page. Paste the recipe, or add a photo of it.';
		return undefined;
	});
	const filledNote = $derived(
		form && 'source' in form && form.source ? FILLED_FROM[form.source] : undefined
	);
</script>

<svelte:head>
	<title>Add a recipe · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/dinner"><Icon name="back" size={18} /> Dinner</a>
	{/snippet}
</PageHeader>

{#if data.ai}
	<AssistBox
		action="?/import"
		target=".recipe-form"
		label="Got it somewhere else? Paste a link or the recipe, or snap a cookbook page, to fill in the form."
		placeholder="https://… or paste the recipe"
		multiline
		photo="optional"
		submitLabel="Fill it in"
		busyLabel="Reading your recipe…"
		linkBusyLabel="Reading the recipe page…"
		photoBusyLabel="Reading the cookbook page…"
		outcome={form && 'assist' in form ? form.assist : null}
		{filledNote}
		{failedNote}
		focusOnFail="#recipe-title"
	/>
{/if}

<!-- A fill swaps in a fresh form with the new values. -->
{#key form}
	<RecipeForm
		values={form && 'values' in form && form.values ? form.values : BLANK_RECIPE_FORM}
		errors={form && 'errors' in form ? form.errors : undefined}
		submitLabel="Add to the cookbook"
		action="?/create"
		photo={form && 'photo' in form ? form.photo : null}
		adoptPhoto
	/>
{/key}
