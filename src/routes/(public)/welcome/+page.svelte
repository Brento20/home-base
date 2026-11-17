<script lang="ts">
	import GlassCard from '#lib/ui/GlassCard.svelte';
</script>

<svelte:head>
	<title>home base</title>
</svelte:head>

<main class="landing">
	<div class="hero">
		<p class="wordmark">home base</p>
		<h1>The plans, chores and lists for the people you live with.</h1>
		<p class="lead">
			One calm place for what’s on this week, whose turn it is, and the wifi password.
		</p>
	</div>

	<GlassCard padding="var(--space-m)">
		<div class="actions">
			<a class="button-primary button-block" href="/signup">Sign up</a>
			<a class="button-secondary button-block" href="/login">Sign in</a>
		</div>
	</GlassCard>
</main>

<style>
	.landing {
		view-transition-name: page;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: var(--space-2xl);
		max-width: 440px;
		min-height: 100dvh;
		margin: 0 auto;
		padding: calc(env(safe-area-inset-top) + 18vh) var(--page-gutter)
			calc(env(safe-area-inset-bottom) + 28px);
	}

	.wordmark {
		font-size: var(--text-small);
		font-weight: var(--weight-strong);
		color: var(--colour-accent);
	}

	h1 {
		margin-top: var(--space-m);
		font-size: clamp(2.125rem, 9vw, 2.75rem);
		line-height: 1.06;
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
		text-wrap: balance;
	}

	.lead {
		margin-top: var(--space-m);
		max-width: 32ch;
		color: var(--colour-text-muted);
		text-wrap: pretty;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
</style>
