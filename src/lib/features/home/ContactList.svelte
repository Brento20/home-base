<script lang="ts">
	/**
	 * Numbers the home keeps (the plumber, the agent, the vet), each with Call and Text buttons,
	 * as a grouped list. Tap the name to see or edit the note it came from.
	 */
	import Icon from '#lib/ui/Icon.svelte';
	import type { Contact } from './house-info.js';

	interface Props {
		contacts: Contact[];
	}

	let { contacts }: Props = $props();
</script>

<ul class="contacts">
	{#each contacts as contact (contact.key)}
		<li>
			<a class="who" href="/home/notes/{contact.noteId}">
				<span class="name">{contact.name}</span>
				<span class="detail">{contact.detail ? `${contact.detail} · ` : ''}{contact.display}</span>
			</a>
			<a class="act" href="sms:{contact.dial}" aria-label="Text {contact.name}">
				<Icon name="message" size={20} />
			</a>
			<a class="act" href="tel:{contact.dial}" aria-label="Call {contact.name}">
				<Icon name="phone" size={20} />
			</a>
		</li>
	{/each}
</ul>

<style>
	.contacts {
		margin: 0;
		padding: 0;
		overflow: hidden;
		border-radius: 18px;
		background: var(--colour-fill);
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 60px;
		padding: 0 10px 0 16px;
	}

	li + li {
		box-shadow: inset 0 1px var(--colour-hairline);
	}

	.who {
		display: flex;
		flex: 1;
		flex-direction: column;
		justify-content: center;
		min-width: 0;
		min-height: 60px;
		color: inherit;
		text-decoration: none;
	}

	.name {
		font-weight: var(--weight-medium);
	}

	.detail {
		overflow: hidden;
		font-size: var(--text-caption);
		font-variant-numeric: tabular-nums;
		color: var(--colour-text-muted);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.act {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		flex: none;
		border-radius: 50%;
		background: var(--colour-accent-soft);
		color: var(--colour-accent);
	}

	.act:active {
		background: var(--colour-press);
	}
</style>
