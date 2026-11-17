/**
 * Loads the liquidglass.dev web components once, in the browser only.
 * Until they load, <lg-*> elements render with the frosted fallback in base.css.
 * Source: https://liquidglass.dev (MIT), vendored in #lib/vendor/liquid-glass.
 */
let loading: Promise<unknown> | null = null;

export function loadGlass() {
	if (typeof window === 'undefined') return Promise.resolve();
	loading ??= import('#lib/vendor/liquid-glass/components.js').catch((error) => {
		console.warn('[home-base] liquid glass unavailable, using frosted fallback', error);
	});
	return loading;
}
