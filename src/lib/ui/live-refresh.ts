import { refreshAll } from '$app/navigation';

/**
 * Keeps everyone's phones in step without a realtime connection: reloads page data when the app
 * comes back to the foreground, and every so often while it's open and visible.
 * Returns a cleanup function.
 */
export function startLiveRefresh(intervalMs = 20_000) {
	let lastRefresh = Date.now();
	let running = false;

	async function refresh() {
		// Don't pull data out from under someone mid-edit.
		const active = document.activeElement;
		if (running || document.visibilityState !== 'visible') return;
		if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
		running = true;
		try {
			await refreshAll();
			lastRefresh = Date.now();
		} finally {
			running = false;
		}
	}

	const onVisible = () => {
		if (document.visibilityState === 'visible' && Date.now() - lastRefresh > 2_000) refresh();
	};

	document.addEventListener('visibilitychange', onVisible);
	window.addEventListener('focus', onVisible);
	const timer = setInterval(refresh, intervalMs);

	return () => {
		document.removeEventListener('visibilitychange', onVisible);
		window.removeEventListener('focus', onVisible);
		clearInterval(timer);
	};
}
