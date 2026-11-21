import { flip } from 'svelte/animate';
import { cubicOut } from 'svelte/easing';
import type { Action } from 'svelte/action';

/**
 * How things change on a screen that's already showing, when fresh data replaces the copy the
 * phone kept (src/lib/ui/kept.svelte.ts) or another phone made a change:
 *
 *   - `in:arrive`   a new item rises (or slides) into place
 *   - `out:leave`   a removed one fades and sinks back a touch
 *   - `animate:glide` items that moved glide to their new place
 *   - `in:reform`   changed text re-forms, fading up out of a soft blur ({#key text})
 *   - `use:changed={signature}` an item whose details changed gives a small pop
 *
 * Svelte's transitions are local, so none of this plays when a screen first appears: only for
 * items added, removed or changed on a screen that's already there. Reduced motion turns it
 * all into plain swaps.
 */

const reduced = () =>
	typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const still = { duration: 0 };

export function arrive(_node: Element, { x = 0, y = 10, delay = 0 } = {}) {
	if (reduced()) return still;
	return {
		delay,
		duration: 340,
		easing: cubicOut,
		css: (t: number, u: number) => `opacity: ${t}; transform: translate(${u * x}px, ${u * y}px)`
	};
}

export function leave(_node: Element) {
	if (reduced()) return still;
	return {
		duration: 200,
		easing: cubicOut,
		css: (t: number) => `opacity: ${t}; transform: scale(${0.96 + 0.04 * t})`
	};
}

export function glide(
	node: Element,
	positions: { from: DOMRect; to: DOMRect },
	params: { duration?: number } = {}
) {
	return flip(node, positions, {
		duration: reduced() ? 0 : (params.duration ?? 320),
		easing: cubicOut
	});
}

export function reform(_node: Element) {
	if (reduced()) return still;
	return {
		duration: 380,
		easing: cubicOut,
		css: (t: number, u: number) =>
			`opacity: ${t}; filter: blur(${u * 4}px); transform: translateY(${u * 4}px)`
	};
}

/** A small pop when `signature` (whatever describes the item) changes after it first shows. */
export const changed: Action<HTMLElement, string> = (node, signature) => {
	let last = signature;
	return {
		update(next: string) {
			if (next === last) return;
			last = next;
			if (reduced()) return;
			node.animate(
				[{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }],
				{ duration: 420, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
			);
		}
	};
};
