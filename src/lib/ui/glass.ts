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

const waiting: (() => void)[] = [];
let pumping = false;

/**
 * Hands out one turn per animation frame, so cards that all want real glass at once (a page that
 * has just slid in) build it one at a time instead of in a single long frame.
 */
export function glassTurn() {
	return new Promise<void>((resolve) => {
		waiting.push(resolve);
		if (!pumping) pump();
	});
}

function pump() {
	pumping = true;
	requestAnimationFrame(() => {
		waiting.shift()?.();
		if (waiting.length) pump();
		else pumping = false;
	});
}
