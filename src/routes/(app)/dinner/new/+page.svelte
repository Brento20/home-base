<script lang="ts">
	import { pick } from '#lib/copy/pick.js';
	import { HEADINGS } from '#lib/copy/voice.js';
	import RecipeForm from '#lib/features/recipes/RecipeForm.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	const heading = pick(HEADINGS.newRecipe);

	const blank = {
		title: '',
		baseServings: '2',
		prepMinutes: '',
		cookMinutes: '',
		restMinutes: '',
		cuisine: '',
		isVegetarian: false,
		isVegan: false,
		proteins: [],
		ingredients: '',
		steps: '',
		energyKj: '',
		proteinG: '',
		carbsG: '',
		fatG: '',
		sugarsG: '',
		fibreG: '',
		notes: ''
	};
</script>

<svelte:head>
	<title>Add a recipe · home base</title>
</svelte:head>

<PageHeader title={heading}>
	{#snippet lead()}
		<a class="button-quiet" href="/dinner"><Icon name="back" size={18} /> Dinner</a>
	{/snippet}
</PageHeader>

<RecipeForm
	values={form?.values ?? blank}
	errors={form?.errors}
	submitLabel="Add to the cookbook"
	cancelHref="/dinner"
/>
