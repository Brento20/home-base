/**
 * Variety without a flicker. A screen's heading or empty state is picked at random, but the
 * page the server sends and the page the browser hydrates have to say the same thing, so until
 * the app has hydrated every pick is the first (default) line. After that, each screen you open
 * inside the app gets a fresh pick, and keeps it while you're on it.
 */

let hydrated = false;

/** Called once by the root layout when the app has hydrated. */
export function markHydrated() {
	hydrated = true;
}

/** One of `lines`: the first during the server render and hydration, a random one after. */
export function pick<T>(lines: readonly T[]): T {
	if (!hydrated || lines.length < 2) return lines[0];
	return lines[Math.floor(Math.random() * lines.length)];
}

/** A shuffled copy of `lines`, so a placeholder reel starts somewhere new each time. */
export function shuffled<T>(lines: readonly T[]): T[] {
	const copy = [...lines];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}
