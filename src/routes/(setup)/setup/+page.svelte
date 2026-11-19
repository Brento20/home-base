<script lang="ts">
	import GlassSurface from '#lib/ui/GlassSurface.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import SoloScreen from '#lib/ui/SoloScreen.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Welcome home · home base</title>
</svelte:head>

<SoloScreen
	title="Welcome home, {data.nickname}"
	lead="Build a home for the people you live with, or join one someone has already made."
>
	<nav class="choices" aria-label="Build or join a home">
		<a class="choice" href="/setup/build">
			<GlassSurface radius={28} glow squish />
			<span class="body">
				<span class="text">
					<span class="title">Build a home</span>
					<span class="detail">Name it and set a password to share.</span>
				</span>
				<Icon name="chevron" size={20} />
			</span>
		</a>
		<a class="choice" href="/setup/join">
			<GlassSurface radius={28} squish />
			<span class="body">
				<span class="text">
					<span class="title">Join a home</span>
					<span class="detail">Use the name and password someone gave you.</span>
				</span>
				<Icon name="chevron" size={20} />
			</span>
		</a>
	</nav>

	{#snippet footer()}
		<div class="links">
			<a href="/setup/profile">Edit your profile</a>
			<form method="POST" action="/logout"><button class="button-quiet">Sign out</button></form>
		</div>
	{/snippet}
</SoloScreen>

<style>
	.choices {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.choice {
		position: relative;
		display: block;
		border-radius: var(--radius-card);
		color: inherit;
		text-decoration: none;
		-webkit-tap-highlight-color: transparent;
	}

	.body {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: var(--space-m);
		min-height: 96px;
		padding: 20px 22px;
		border-radius: inherit;
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline-strong),
			var(--glass-highlight);
	}

	.choice:first-child .body {
		box-shadow:
			inset 0 0 0 1px var(--colour-accent-edge),
			var(--glass-highlight);
	}

	.text {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 4px;
	}

	.title {
		font-size: 1.25rem;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
	}

	.detail {
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.choice :global(.icon) {
		color: var(--colour-text-faint);
	}

	.links {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-l);
	}

	/* Two quiet options side by side, so they match Sign out. */
	.links a {
		font-weight: var(--weight-regular, 400);
		color: var(--colour-text-muted);
	}
</style>
