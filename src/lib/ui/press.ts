/**
 * Press feedback for every button, link and pill in the app, from one listener.
 *
 * iOS Safari often skips `:active` on a quick tap, and shows it the instant a finger lands
 * even when that finger is starting a scroll. So instead, whatever you press gets a
 * `data-pressed` attribute, and the CSS (base.css and each component) styles that:
 *
 *   - It waits a beat (PRESS_DELAY) before showing, so starting a scroll on top of a card
 *     doesn't flash it. A tap that ends sooner still shows the press.
 *   - It's held for at least MIN_HOLD, so even the quickest tap is felt, then springs back.
 *   - Moving more than SLOP pixels, a scroll or a cancelled touch drops it without the hold.
 *
 * The innermost pressable element wins, so a button inside a card presses on its own.
 * Install once, from the root layout.
 */

const PRESSABLE = 'button:not(:disabled), a[href], label, summary, [role="button"], [data-press]';
const IGNORE =
	'input:not([type="checkbox"]):not([type="radio"]), textarea, select, [data-no-press]';

const PRESS_DELAY = 60;
const MIN_HOLD = 130;
const SLOP = 8;

export function installPress() {
	let target: HTMLElement | null = null;
	let pressedAt = 0;
	let startX = 0;
	let startY = 0;
	let showTimer: ReturnType<typeof setTimeout> | undefined;
	let releaseTimer: ReturnType<typeof setTimeout> | undefined;

	function show() {
		clearTimeout(showTimer);
		if (!target || pressedAt) return;
		target.dataset.pressed = '';
		pressedAt = performance.now();
	}

	function clear(element: HTMLElement | null) {
		if (element) delete element.dataset.pressed;
	}

	function cancel() {
		clearTimeout(showTimer);
		clear(target);
		target = null;
		pressedAt = 0;
	}

	function onDown(event: PointerEvent) {
		if (!event.isPrimary || event.button > 0) return;
		const element = (event.target as Element | null)?.closest<HTMLElement>(PRESSABLE);
		if (!element || (event.target as Element).closest(IGNORE)) return;
		// A new press while the last one is still springing back takes over at once.
		clearTimeout(releaseTimer);
		cancel();
		target = element;
		startX = event.clientX;
		startY = event.clientY;
		if (event.pointerType === 'mouse') show();
		else showTimer = setTimeout(show, PRESS_DELAY);
	}

	function onMove(event: PointerEvent) {
		if (!target || !event.isPrimary) return;
		if (Math.hypot(event.clientX - startX, event.clientY - startY) > SLOP) cancel();
	}

	function onUp(event: PointerEvent) {
		if (!target || !event.isPrimary) return;
		show();
		const element = target;
		const held = performance.now() - pressedAt;
		target = null;
		pressedAt = 0;
		releaseTimer = setTimeout(() => clear(element), Math.max(0, MIN_HOLD - held));
	}

	const options = { capture: true, passive: true } as const;
	document.addEventListener('pointerdown', onDown, options);
	document.addEventListener('pointermove', onMove, options);
	document.addEventListener('pointerup', onUp, options);
	document.addEventListener('pointercancel', cancel, options);
	document.addEventListener('scroll', cancel, options);
	return () => {
		cancel();
		clearTimeout(releaseTimer);
		document.removeEventListener('pointerdown', onDown, options);
		document.removeEventListener('pointermove', onMove, options);
		document.removeEventListener('pointerup', onUp, options);
		document.removeEventListener('pointercancel', cancel, options);
		document.removeEventListener('scroll', cancel, options);
	};
}
