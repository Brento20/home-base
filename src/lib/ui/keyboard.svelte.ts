/**
 * How much of the screen the on-screen keyboard covers, in px (0 when it's down), for things
 * that ride on top of it (ActionDock's `lift`). iOS doesn't shrink the page for the keyboard;
 * only the visual viewport shrinks, so the keyboard is what's left below it. Anything under
 * 100px is a browser bar, not a keyboard.
 */
export function keyboardHeight() {
	let height = $state(0);

	$effect(() => {
		const viewport = window.visualViewport;
		if (!viewport) return;
		const measure = () => {
			const covered = window.innerHeight - viewport.height - viewport.offsetTop;
			height = covered > 100 ? Math.round(covered) : 0;
		};
		measure();
		viewport.addEventListener('resize', measure);
		viewport.addEventListener('scroll', measure);
		return () => {
			viewport.removeEventListener('resize', measure);
			viewport.removeEventListener('scroll', measure);
		};
	});

	return {
		get current() {
			return height;
		}
	};
}
