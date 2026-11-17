<script lang="ts">
	import { enhance } from '$app/forms';
	import ListDetail from '#lib/features/lists/ListDetail.svelte';
	import ConfirmDelete from '#lib/ui/ConfirmDelete.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import PageHeader from '#lib/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Edit mode reveals remove buttons, rename and delete; the resting view stays clean.
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
	{#snippet action()}
		<button
			class="edit-toggle"
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
		<ConfirmDelete action="?/delete" label="Delete list" />
	</section>
{/if}

<style>
	.edit-toggle {
		min-width: 64px;
		min-height: var(--tap-target);
		padding: 0 16px;
		border: 1px solid var(--colour-hairline-strong);
		border-radius: var(--radius-pill);
		background: none;
		font-size: var(--text-small);
		font-weight: var(--weight-medium);
	}

	.edit-toggle[aria-pressed='true'] {
		border-color: var(--colour-accent-edge);
		background: var(--colour-accent-soft);
	}

	.manage {
		display: flex;
		flex-direction: column;
		gap: var(--space-m);
		margin-top: var(--space-xl);
		padding-top: var(--space-l);
		border-top: 1px solid var(--colour-hairline);
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
