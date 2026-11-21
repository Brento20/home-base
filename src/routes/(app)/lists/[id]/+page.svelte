<script lang="ts">
	import { enhance } from '$app/forms';
	import ListDetail from '#lib/features/lists/ListDetail.svelte';
	import ConfirmDelete from '#lib/ui/ConfirmDelete.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Edit mode reveals remove buttons and rename; the resting view stays clean. Deleting the
	// list sits at the foot of the page, as it does for a task.
	let editing = $state(false);
</script>

<svelte:head>
	<title>{data.list.name} · home base</title>
</svelte:head>

<PageHeader title={data.list.name}>
	{#snippet lead()}
		<a class="button-quiet" href={data.list.completedAt ? '/lists/past' : '/lists'}
			><Icon name="back" size={18} /> {data.list.completedAt ? 'Past lists' : 'Lists'}</a
		>
	{/snippet}
	{#snippet trailing()}
		<button
			class="button-edit"
			type="button"
			aria-pressed={editing}
			onclick={() => (editing = !editing)}
		>
			{editing ? 'Done' : 'Edit'}
		</button>
	{/snippet}
</PageHeader>

<ListDetail
	list={data.list}
	people={data.household.members}
	{editing}
	message={form && 'message' in form ? form.message : undefined}
/>

{#if editing}
	<section class="manage" aria-label="Manage list">
		<form
			method="POST"
			action="?/rename"
			class="rename"
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
		>
			<label class="field">
				<span class="field-label">List name</span>
				<span class="rename-row">
					<input class="field-input" name="name" value={data.list.name} maxlength="60" required />
					<button class="button-primary">Rename</button>
				</span>
			</label>
			{#if form && 'renameErrors' in form && form.renameErrors?.name}
				<p class="field-error">{form.renameErrors.name}</p>
			{/if}
		</form>
	</section>
{/if}

{#if data.list.pinned}
	{#if editing}
		<p class="group-note pinned-note">
			The Shopping list is always here, so you can add to it from Today. Rename it if you like.
		</p>
	{/if}
{:else}
	<ConfirmDelete action="?/delete" label="Delete list" />
{/if}

<style>
	.pinned-note {
		margin-top: var(--space-m);
	}

	.manage {
		margin-top: var(--space-xl);
	}

	.rename-row {
		display: flex;
		gap: var(--space-s);
	}

	.rename-row .field-input {
		flex: 1;
		min-width: 0;
	}

	.rename-row .button-primary {
		min-height: 50px;
		padding: 0 18px;
	}
</style>
