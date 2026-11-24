<script lang="ts">
	import Conversation from '#lib/features/feed/Conversation.svelte';
	import PostCard from '#lib/features/feed/PostCard.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import type { Profile } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const post = $derived(data.post);
	const people = $derived(data.household.members);

	const someone: Pick<Profile, 'displayName' | 'initials' | 'accentColour' | 'avatarUrl'> = {
		displayName: 'Someone',
		initials: '?',
		accentColour: 'var(--chart-other)',
		avatarUrl: null
	};
	const personFor = (id: string | null) => people.find((person) => person.id === id) ?? someone;
	const nameFor = (id: string | null) => (id === data.me.id ? 'You' : personFor(id).displayName);
</script>

<svelte:head>
	<title>{nameFor(post.authorId)}’s post · home base</title>
</svelte:head>

<nav class="top-bar" aria-label="Post">
	<a class="button-quiet back" href="/"><Icon name="back" size={18} /> Today</a>
</nav>

<!-- The page's heading for VoiceOver; the card itself says who posted. -->
<h1 class="visually-hidden">{nameFor(post.authorId)}’s post</h1>

<PostCard {post} {people} me={data.me.id} full />

<Conversation
	replies={post.replies}
	{people}
	me={data.me.id}
	replyMax={data.replyMax}
	problem={form?.replyProblem}
/>

<style>
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: -10px 0 var(--space-m) -4px;
	}
</style>
