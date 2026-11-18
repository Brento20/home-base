<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import RecipeForm from '#lib/features/recipes/RecipeForm.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const heading = pick(HEADINGS.editRecipe);
</script>

<svelte:head>
	<title>Edit {data.recipe.title} · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/dinner/{data.recipe.id}"><Icon name="back" size={18} /> Recipe</a
		>
	{/snippet}
</PageHeader>

<RecipeForm values={form?.values ?? data.values} errors={form?.errors} submitLabel="Save" />
