/**
 * A light haptic tap, felt when something is saved, ticked off or switched.
 *
 * iPhone Safari has no vibration API, but since iOS 18 a native switch
 * (`<input type="checkbox" switch>`) taps the Taptic Engine when it flips, even when the flip
 * comes from a click on its label. So the tap is one hidden switch, clicked from inside the
 * person's own tap (it only works within one). Elsewhere `navigator.vibrate` does it; where
 * neither exists, nothing happens. iOS's own System Haptics setting turns it off.
 *
 * Wired once, in the root layout (`listenForHaptics`): a tap on anything marked `data-haptic`,
 * on a primary button that submits a form (a save), or on a checkbox or radio (a switch or a
 * choice) gets one. Mark check-off ticks, stars and reactions with `data-haptic`.
 */

let engine: HTMLLabelElement | null = null;

function switchEngine() {
	if (engine?.isConnected) return engine;
	engine = document.createElement('label');
	engine.dataset.hapticEngine = '';
	engine.setAttribute('aria-hidden', 'true');
	engine.style.cssText =
		'position:fixed;left:-200px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
	const input = document.createElement('input');
	input.type = 'checkbox';
	input.setAttribute('switch', '');
	input.tabIndex = -1;
	engine.append(input);
	// Its own clicks stop here, so nothing listening on the page ever sees them.
	engine.addEventListener('click', (event) => event.stopPropagation());
	document.body.append(engine);
	return engine;
}

/** One light tap. Call it from inside a tap (a click or change handler). */
export function haptic() {
	if (typeof document === 'undefined') return;
	if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
		navigator.vibrate(8);
		return;
	}
	switchEngine().click();
}

/** What earns a tap: marked things, saves, switches and choices. */
function earnsTap(target: Element) {
	if (target.closest('[data-haptic-engine]')) return false;
	if (target.closest('[data-haptic]')) return true;
	if (target instanceof HTMLInputElement)
		return target.type === 'checkbox' || target.type === 'radio';
	const button = target.closest('button.button-primary');
	return button instanceof HTMLButtonElement && button.type === 'submit' && Boolean(button.form);
}

/** Listens for taps that earn a haptic, for the life of the app. Returns the way to stop. */
export function listenForHaptics() {
	const onClick = (event: MouseEvent) => {
		if (event.target instanceof Element && earnsTap(event.target)) haptic();
	};
	document.addEventListener('click', onClick, true);
	return () => document.removeEventListener('click', onClick, true);
}
