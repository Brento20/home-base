/**
 * Charts draw themselves in when they first come into view: `use:reveal` adds the `shown` class
 * once the element is on screen, and the chart's CSS animates from its "before" state to that.
 * One observer, no animation loop: the work is done by CSS transitions on transforms and stroke
 * offsets, which the phone hands to the GPU. With Reduce Motion it shows at once.
 */
export function reveal(element: HTMLElement | SVGElement) {
	const show = () => element.classList.add('shown');
	if (
		typeof IntersectionObserver === 'undefined' ||
		matchMedia('(prefers-reduced-motion: reduce)').matches
	) {
		show();
		return;
	}
	const observer = new IntersectionObserver(
		(entries) => {
			if (entries.some((entry) => entry.isIntersecting)) {
				// A frame later, so the "before" state has painted and the transition runs.
				requestAnimationFrame(show);
				observer.disconnect();
			}
		},
		{ threshold: 0.25 }
	);
	observer.observe(element);
	return { destroy: () => observer.disconnect() };
}
