<script lang="ts">
	/**
	 * Two small notices that make the installed app behave like an app:
	 * - "Offline": shown while there's no connection, so it's clear pages are saved copies;
	 * - "New version": shown when the service worker has installed an update. It only reloads
	 *   when tapped, so nothing changes under someone mid-task.
	 * The app also checks for updates whenever it comes back to the foreground, because an
	 * installed app can stay open for days.
	 */
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	let offline = $state(false);
	let waiting = $state<ServiceWorker | null>(null);
	let refreshing = false;

	onMount(() => {
		const updateOnline = () => (offline = !navigator.onLine);
		updateOnline();
		window.addEventListener('online', updateOnline);
		window.addEventListener('offline', updateOnline);
		const cleanups = [
			() => window.removeEventListener('online', updateOnline),
			() => window.removeEventListener('offline', updateOnline)
		];

		if ('serviceWorker' in navigator) {
			const sw = navigator.serviceWorker;
			let registration: ServiceWorkerRegistration | undefined;

			// Only an update counts: the very first install has no controller yet.
			const watch = (worker: ServiceWorker | null) => {
				if (!worker) return;
				const check = () => {
					if (worker.state === 'installed' && sw.controller) waiting = worker;
				};
				check();
				worker.addEventListener('statechange', check);
			};

			sw.ready.then((ready) => {
				registration = ready;
				watch(ready.waiting);
				ready.addEventListener('updatefound', () => watch(ready.installing));
			});

			const checkForUpdate = () => {
				if (document.visibilityState === 'visible') registration?.update().catch(() => {});
			};
			document.addEventListener('visibilitychange', checkForUpdate);

			// Reload once the new version has taken over, but only when asked to.
			const reload = () => {
				if (refreshing) window.location.reload();
			};
			sw.addEventListener('controllerchange', reload);

			cleanups.push(
				() => document.removeEventListener('visibilitychange', checkForUpdate),
				() => sw.removeEventListener('controllerchange', reload)
			);
		}

		return () => cleanups.forEach((cleanup) => cleanup());
	});

	function refresh() {
		refreshing = true;
		if (waiting) waiting.postMessage({ type: 'SKIP_WAITING' });
		else window.location.reload();
	}
</script>

<div class="status" aria-live="polite">
	{#if waiting}
		<div class="notice" transition:fly={{ y: -16, duration: 320 }}>
			<span>New version ready</span>
			<button type="button" onclick={refresh}>Refresh</button>
		</div>
	{:else if offline}
		<div class="notice quiet" transition:fly={{ y: -16, duration: 320 }}>
			<span class="dot" aria-hidden="true"></span>
			<span>Offline. Showing saved pages.</span>
		</div>
	{/if}
</div>

<style>
	.status {
		position: fixed;
		top: calc(env(safe-area-inset-top) + 8px);
		left: 0;
		right: 0;
		z-index: 20;
		display: flex;
		justify-content: center;
		padding: 0 var(--page-gutter);
		pointer-events: none;
	}

	.notice {
		display: flex;
		align-items: center;
		gap: 12px;
		max-width: 420px;
		min-height: 44px;
		padding: 6px 6px 6px 18px;
		border-radius: var(--radius-pill);
		/* Nearly solid: it floats over page headings and has to read at a glance. */
		background: rgb(20 16 14 / 0.92);
		-webkit-backdrop-filter: var(--glass-blur);
		backdrop-filter: var(--glass-blur);
		box-shadow:
			inset 0 0 0 1px var(--colour-hairline-strong),
			var(--glass-highlight),
			var(--shadow-lift);
		font-size: var(--text-small);
		pointer-events: auto;
	}

	.notice.quiet {
		padding-right: 18px;
		color: var(--colour-text-muted);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--colour-accent);
	}

	button {
		min-height: 34px;
		padding: 0 14px;
		border: 0;
		border-radius: var(--radius-pill);
		background: var(--colour-accent);
		color: var(--colour-on-accent);
		font-size: var(--text-small);
		font-weight: var(--weight-strong);
	}
</style>
