/**
 * Marking what an AI helper filled in, and putting it back.
 *
 * Before a helper runs, `snapshot` notes every field in the form it will fill. After the form
 * comes back filled, `markFilled` gives each field that changed the spectrum ring (ai.css), which
 * fades on its own or as soon as the person edits that field. `restore` puts the snapshot back,
 * for Undo.
 */

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
export type Snapshot = Map<string, string>;

const SKIP = new Set(['hidden', 'file', 'submit', 'button', 'reset']);

/** Named fields a person can change. The show-more chips have no name, so they're left out. */
function controls(form: HTMLFormElement): Control[] {
	return [...form.elements].filter(
		(element): element is Control =>
			(element instanceof HTMLInputElement ||
				element instanceof HTMLTextAreaElement ||
				element instanceof HTMLSelectElement) &&
			Boolean(element.name) &&
			!SKIP.has(element.type)
	);
}

const checkable = (control: Control): control is HTMLInputElement =>
	control instanceof HTMLInputElement && (control.type === 'radio' || control.type === 'checkbox');

/** Radios and checkboxes are keyed by name and value; everything else by name. */
const keyOf = (control: Control) =>
	checkable(control) ? `${control.name}=${control.value}` : control.name;

const valueOf = (control: Control) =>
	checkable(control) ? String(control.checked) : control.value;

export function snapshot(form: HTMLFormElement | null | undefined): Snapshot {
	const values: Snapshot = new Map();
	if (form) for (const control of controls(form)) values.set(keyOf(control), valueOf(control));
	return values;
}

/** Puts a snapshot back, telling each field it changed so the page's own state follows. */
export function restore(form: HTMLFormElement | null | undefined, values: Snapshot) {
	if (!form) return;
	for (const control of controls(form)) {
		const saved = values.get(keyOf(control));
		if (saved === undefined || saved === valueOf(control)) continue;
		if (checkable(control)) control.checked = saved === 'true';
		else control.value = saved;
		control.dispatchEvent(new Event('input', { bubbles: true }));
		control.dispatchEvent(new Event('change', { bubbles: true }));
	}
}

/**
 * Rings every field that's different from the snapshot: the field itself, or for a choice, the
 * pill that's now picked. Returns how many it marked.
 */
export function markFilled(form: HTMLFormElement | null | undefined, before: Snapshot): number {
	if (!form) return 0;
	let marked = 0;
	for (const control of controls(form)) {
		if (before.get(keyOf(control)) === valueOf(control)) continue;
		if (checkable(control) && !control.checked) continue;
		// A field drawn inside a wrapper (like the Tasks title row) rings the wrapper.
		const target = checkable(control)
			? control.closest<HTMLElement>('label')
			: (control.closest<HTMLElement>('[data-ai-ring]') ?? control);
		if (!target) continue;

		target.setAttribute('data-ai-filled', '');
		marked++;
		const clear = () => target.removeAttribute('data-ai-filled');
		// Gone once it has faded, or straight away when the person changes it themselves.
		target.addEventListener(
			'animationend',
			(event) => {
				if (event.animationName === 'ai-fade') clear();
			},
			{ once: false }
		);
		control.addEventListener('input', clear, { once: true });
	}
	return marked;
}

/** Takes every ring off a form straight away: on Undo, or once what was filled is saved. */
export function clearFilled(form: HTMLFormElement | null | undefined) {
	if (!form) return;
	for (const element of form.querySelectorAll('[data-ai-filled]'))
		element.removeAttribute('data-ai-filled');
}
