/**
 * The backdrop's glows drift: each wanders a few percent of the screen and swells or shrinks a
 * little, over about a minute and a half, so the colour feels alive without anything you'd
 * notice moving. Use it on every element with `.backdrop-paint` (`use:drift`).
 *
 * Those elements (the backdrop and the fades at the top, above the tab bar and behind the
 * action dock) paint the same picture so the page melts into it, so they must move exactly
 * together. Each gets its own Web Animation, all set to the same wall-clock phase, so one
 * added later (the action dock on a form page) joins in step. It only moves background
 * position and size, in small steps (see STEPS), and stays still with Reduce Motion or with
 * the glows turned down (`data-glow="low"`, a display preference).
 */

/** Layer order matches `.backdrop-paint`: grain, then the three glows. */
interface Pose {
	/** Each glow's offset (vw, dvh) and size (1 = the screen). */
	glows: [x: number, y: number, size: number][];
}

const POSES: Pose[] = [
	{
		glows: [
			[0, 0, 1],
			[0, 0, 1],
			[0, 0, 1]
		]
	},
	{
		glows: [
			[-6, 5, 1.12],
			[8, -5, 0.9],
			[-5, -3, 1.1]
		]
	},
	{
		glows: [
			[-10, -3, 0.92],
			[3, 6, 1.16],
			[6, -6, 0.92]
		]
	},
	{
		glows: [
			[5, 6, 1.06],
			[-6, 3, 1],
			[-3, 2, 1.16]
		]
	}
];

/** One way through the poses; it then plays back the other way, so it never jumps. */
const DURATION_MS = 45_000;

/**
 * Background position and size can't be animated on the GPU, so every change repaints these
 * full-screen layers. At 60 frames a second that kept the phone busy for a drift you can't see
 * frame to frame (well under a pixel each), so it moves in about eight steps a second instead:
 * the same drift, a fraction of the work. Between steps nothing changes, so nothing repaints.
 */
const STEPS = Math.round((DURATION_MS / 1000) * 8);

function keyframes(grain: string): Keyframe[] {
	return POSES.map((pose, index) => ({
		offset: index / (POSES.length - 1),
		easing: 'ease-in-out',
		// The glow layers are 140% of the screen, overhanging by 20% (see .backdrop-paint). A
		// glow that grows also shifts back by half its growth, so it swells about its middle.
		backgroundPosition: [
			'0 0',
			...pose.glows.map(
				([x, y, size]) => `${x - 20 - (size - 1) * 70}vw ${y - 20 - (size - 1) * 70}dvh`
			)
		].join(', '),
		backgroundSize: [
			`${grain} ${grain}`,
			...pose.glows.map(([, , size]) => `${size * 140}vw ${size * 140}dvh`)
		].join(', ')
	}));
}

export function drift(element: HTMLElement) {
	if (typeof element.animate !== 'function') return;
	const still = matchMedia('(prefers-reduced-motion: reduce)');
	let animation: Animation | null = null;

	function start() {
		animation?.cancel();
		animation = null;
		// Still with Reduce Motion, and for anyone who's turned the glows down (display preferences).
		if (still.matches || document.documentElement.dataset.glow === 'low') return;
		const grain = getComputedStyle(element).getPropertyValue('--grain-size').trim() || '240px';
		animation = element.animate(keyframes(grain), {
			duration: DURATION_MS,
			iterations: Infinity,
			direction: 'alternate',
			easing: `steps(${STEPS}, jump-none)`
		});
		// The same clock for every copy, however late it joins: the wall clock, so reopening
		// the app carries on from where the drift would be rather than starting over.
		animation.startTime = -(performance.timeOrigin % (DURATION_MS * 2));
	}

	start();
	still.addEventListener('change', start);
	const glowSwitch = new MutationObserver(start);
	glowSwitch.observe(document.documentElement, { attributeFilter: ['data-glow'] });
	return {
		destroy() {
			still.removeEventListener('change', start);
			glowSwitch.disconnect();
			animation?.cancel();
		}
	};
}
