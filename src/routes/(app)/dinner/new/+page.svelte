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
	const filledNote = $derived(
		form && 'source' in form && form.source
			? `${FILLED_FROM[form.source]} Check it over, then save.`
			: undefined
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
		label="Got it somewhere else? Paste a link or the recipe, or snap a cookbook page."
		placeholder="https://… or paste the recipe"
		multiline
		photo="optional"
		submitLabel="Fill it in"
		busyLabel="Reading it…"
		outcome={form && 'assist' in form ? form.assist : null}
		{filledNote}
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
	/>
{/key}
