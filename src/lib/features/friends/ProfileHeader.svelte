<script lang="ts">
	/**
	 * The top of a profile, yours or a friend's: a wash of their colour, their photo, name, the
	 * line they wrote about themselves, and a few facts (home, pronouns, friends since).
	 */
	import Avatar from '#lib/ui/Avatar.svelte';
	import Icon, { type IconName } from '#lib/ui/Icon.svelte';
	import type { Profile } from '#lib/types.js';

	interface Props {
		person: Pick<Profile, 'displayName' | 'initials' | 'accentColour' | 'avatarUrl'>;
		name: string;
		bio?: string;
		facts?: { icon?: IconName; text: string }[];
	}

	let { person, name, bio = '', facts = [] }: Props = $props();
</script>

<section class="profile-header" style:--person={person.accentColour} aria-label="About {name}">
	<div class="wash" aria-hidden="true"></div>
	<Avatar {person} size={92} ring />
	<h2 class="name">{name}</h2>
	{#if bio}<p class="bio">{bio}</p>{/if}
	{#if facts.length}
		<ul class="facts">
			{#each facts as fact (fact.text)}
				<li>
					{#if fact.icon}<Icon name={fact.icon} size={14} />{/if}
					{fact.text}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.profile-header {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 28px 18px 20px;
		overflow: hidden;
		border-radius: 28px;
		background: var(--colour-fill);
		box-shadow: inset 0 0 0 var(--hairline) var(--colour-separator);
		text-align: center;
	}

	/* Their colour, soft at the top and gone by the middle. */
	.wash {
		position: absolute;
		inset: 0 0 45%;
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--person) 38%, transparent),
			transparent
		);
		pointer-events: none;
	}

	.profile-header > :global(*:not(.wash)) {
		position: relative;
	}

	.name {
		margin-top: 8px;
		font-size: var(--text-headline);
		font-weight: var(--weight-display-m);
		line-height: 1.2;
		font-family: var(--font-display);
		letter-spacing: var(--tracking-display-m);
	}

	.bio {
		max-width: 30ch;
		line-height: 1.4;
		overflow-wrap: anywhere;
	}

	.facts {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 4px 14px;
		margin: 6px 0 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.facts li {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
</style>
