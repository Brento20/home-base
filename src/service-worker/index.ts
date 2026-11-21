/**
 * home base's service worker. SvelteKit registers it automatically.
 *
 * - The app shell (built JS and CSS) and the static files are cached on install, so the app opens
 *   instantly and works without signal.
 * - Pages and their data are fetched from the network first. If that fails, or takes longer than
 *   a few seconds, the last saved copy is shown instead, so a shopping list still opens in a shop
 *   with no reception. Pages never seen before fall back to /offline.html.
 * - Profile and feed photos are cached once fetched (their URLs change whenever the photo does).
 * - Built files that load later than install (some styles do) are kept the first time they load.
 * - Form submissions and anything that changes data always go to the network.
 * - Signing out deletes every saved page, so nothing personal is left on the phone.
 */
import { immutable, assets } from '$app/manifest';
import { version } from '$app/env';
import { self } from '$app/service-worker';

const SHELL = `shell-${version}`;
const PAGES = 'pages';
const OFFLINE_PAGE = '/offline.html';
/** How long to wait for the network before showing the saved copy of a page. */
const NETWORK_TIMEOUT_MS = 4000;

// Splash screens are only read by iOS when the app is added to the home screen, so they aren't
// worth downloading again for offline use.
// SvelteKit lists these relative to the site root ("_app/immutable/…"), so they're made absolute
// to compare with request paths.
const shellFiles = [...immutable, ...assets]
	.map((file) => `/${file.path.replace(/^\//, '')}`)
	.filter((path) => !path.startsWith('/splash/'));

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(shellFiles)));
});

self.addEventListener('activate', (event) => {
	// Old app shells go; saved pages stay, since they're still useful offline.
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((key) => key !== SHELL && key !== PAGES).map((key) => caches.delete(key))
				)
			)
			.then(() => self.clients.claim())
	);
});

// The page asks for this when someone taps "Refresh" on the update notice.
self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	if (request.method !== 'GET') {
		if (url.pathname === '/logout') event.waitUntil(caches.delete(PAGES));
		return;
	}

	// Built files never change once deployed (their names carry a hash), so they're safe to keep.
	// Not every one is in the install list, so any that load later are kept as they arrive.
	if (shellFiles.includes(url.pathname) || url.pathname.startsWith('/_app/immutable/')) {
		event.respondWith(fromCacheFirst(request, SHELL));
		return;
	}

	// Profile photos change URL with every new photo; a feed post's photo never changes.
	if (url.pathname.startsWith('/avatars/') || url.pathname.startsWith('/feed/photos/')) {
		event.respondWith(fromCacheFirst(request, PAGES));
		return;
	}

	const isPageData = url.pathname.endsWith('/__data.json');
	if (request.mode === 'navigate' || isPageData) {
		event.respondWith(fromNetworkFirst(request, isPageData, event));
	}
});

/** Saves the data SvelteKit fetches when moving to this page within the app. */
async function saveDataFor(page: URL, cache: Cache) {
	const dataUrl = new URL(`${page.pathname.replace(/\/$/, '')}/__data.json`, page.origin);
	try {
		const response = await fetch(dataUrl, { credentials: 'same-origin' });
		if (response.ok && !response.redirected) await cache.put(dataUrl, response);
	} catch {
		// Offline already: the page itself is saved, which is what matters most.
	}
}

async function fromCacheFirst(request: Request, cacheName: string) {
	// Servers often mark files as varying by Origin, and SvelteKit fetches styles both with and
	// without one; the file is the same either way.
	const cached = await caches.match(request, { ignoreVary: true });
	if (cached) return cached;
	const response = await fetch(request);
	if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
	return response;
}

/**
 * The network if it answers in time; otherwise the last copy saved for this page. A slow answer
 * still updates the saved copy when it eventually arrives.
 */
async function fromNetworkFirst(request: Request, isPageData: boolean, event: FetchEvent) {
	const cache = await caches.open(PAGES);
	// Page data URLs carry a changing ?x-sveltekit-invalidated= query, so match on the path.
	const saved = () => cache.match(request, { ignoreSearch: isPageData, ignoreVary: true });

	// The response goes to the page the moment it starts arriving; the saved copy is written
	// alongside. (Waiting for cache.put would hold the page until the whole body had downloaded,
	// which stopped streamed data, like Today's feed, from showing anything early.)
	const network = fetch(request).then((response) => {
		// Only keep complete, signed-in pages: not redirects (to sign in) or errors.
		if (response.ok && !response.redirected && response.type === 'basic') {
			event.waitUntil(
				cache.put(request, response.clone()).then(() => {
					// Moving between tabs fetches a page's data rather than the page. Offline,
					// SvelteKit can't fall back from a missing data file, so save it alongside.
					if (!isPageData) return saveDataFor(new URL(request.url), cache);
				})
			);
		}
		// Landing on the signed-out page means the session has gone: forget saved pages.
		if (response.redirected && new URL(response.url).pathname === '/welcome') {
			event.waitUntil(caches.delete(PAGES));
		}
		return response;
	});

	const timeout = new Promise<'timeout'>((resolve) =>
		setTimeout(() => resolve('timeout'), NETWORK_TIMEOUT_MS)
	);

	try {
		const first = await Promise.race([network, timeout]);
		if (first !== 'timeout') return first;
		const copy = await saved();
		return copy ?? (await network);
	} catch {
		const copy = await saved();
		if (copy) return copy;
		// A network error (rather than a 503) makes SvelteKit fall back to loading the whole page,
		// which can then come from its saved copy.
		if (isPageData) return Response.error();
		return (
			(await caches.match(OFFLINE_PAGE, { ignoreVary: true })) ??
			new Response('Offline', { status: 503 })
		);
	}
}
