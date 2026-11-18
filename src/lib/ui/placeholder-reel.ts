/**
 * A placeholder that scrolls through suggestions: `use:placeholderReel={PLACEHOLDERS.planTitle}`.
 *
 * While a field is empty and nobody's touched it, its hint slides up to the next suggestion
 * every few seconds ("Shucking oysters on the beach?" → "Brunch with Gaga?"), starting from the
 * field's own placeholder and then a shuffled order, so it's different each visit. Focusing the
 * field stops the reel on whatever it's showing; typing hides it; clearing the field brings it
 * back. With reduced motion it shows one suggestion and stays still.
 *
 * Only one reel moves at a time, so a screen with several fields never has hints moving all
 * over it. The lead is the first field on the page that is empty, on screen and not yet touched.
 * Fill it in, or tap into it and leave it empty, and the lead passes to the next field down.
 * Every other reel holds still on its current line. A reel also comes to rest for good after
 * a few suggestions (MAX_STEPS), so a page left open settles down instead of moving forever.
 *
 * The suggestions are drawn over the field (aria-hidden): the field's label stays what screen
 * readers hear. The field's own `placeholder` is the no-JavaScript fallback and the first line.
 */

import { shuffled } from '#lib/copy/pick.js';

type Field = HTMLInputElement | HTMLTextAreaElement;

/** How long each suggestion stays up. Keep in step with the line transition in forms.css. */
const STEP_MS = 4200;
const FIRST_STEP_MS = 3200;
/** How long a line takes to slide out, before it's parked underneath for its next turn. */
const SLIDE_MS = 1000;
/** Suggestions shown after the first before the reel rests. */
const MAX_STEPS = 5;

interface Reel {
	field: Field;
	/** Empty, on screen and untouched: in line to lead. */
	inLine(): boolean;
	run(): void;
	hold(): void;
}

const reels = new Set<Reel>();
let electionQueued = false;

/** Lets the first reel in line, in page order, move; holds every other one still. */
function elect() {
	electionQueued = false;
	const ordered = [...reels].sort((a, b) =>
		a.field.compareDocumentPosition(b.field) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
	);
	const lead = ordered.find((reel) => reel.inLine());
	for (const reel of ordered) {
		if (reel === lead) reel.run();
		else reel.hold();
	}
}

function queueElection() {
	if (electionQueued) return;
	electionQueued = true;
	queueMicrotask(elect);
}

export function placeholderReel(field: Field, lines: readonly string[]) {
	const parent = field.parentElement;
	if (!parent || lines.length === 0) return;

	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const first = field.placeholder || lines[0];
	let queue = [first, ...shuffled(lines.filter((line) => line !== first))];
	let index = 0;

	if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
	const reel = document.createElement('span');
	reel.className = 'placeholder-reel';
	if (field instanceof HTMLTextAreaElement) reel.classList.add('multiline');
	reel.setAttribute('aria-hidden', 'true');
	const current = document.createElement('span');
	const next = document.createElement('span');
	current.className = next.className = 'placeholder-reel-line';
	next.classList.add('below');
	const textOf = (line: HTMLElement) => line.firstElementChild as HTMLElement;
	for (const line of [current, next]) line.append(document.createElement('span'));
	textOf(current).textContent = queue[0];
	reel.append(current, next);
	parent.append(reel);

	// The field shows nothing of its own while the reel is drawn over it.
	const ownPlaceholder = field.placeholder;
	field.placeholder = '';

	let lineA = current;
	let lineB = next;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let onScreen = true;
	/** Tapped into and left empty: the lead moves on to the next field. */
	let touched = false;
	let steps = 0;

	/** Lines the reel up with the field's text box: position, padding and type. */
	function fit() {
		const style = getComputedStyle(field);
		Object.assign(reel.style, {
			left: `${field.offsetLeft}px`,
			top: `${field.offsetTop}px`,
			width: `${field.offsetWidth}px`,
			height: `${field.offsetHeight}px`,
			paddingTop: style.paddingTop,
			paddingRight: style.paddingRight,
			paddingBottom: style.paddingBottom,
			paddingLeft: style.paddingLeft,
			fontSize: style.fontSize,
			fontWeight: style.fontWeight,
			lineHeight: style.lineHeight,
			letterSpacing: style.letterSpacing,
			borderRadius: style.borderRadius
		});
	}

	function step() {
		steps += 1;
		index = (index + 1) % queue.length;
		if (index === 0) queue = [queue[0], ...shuffled(queue.slice(1))];
		textOf(lineB).textContent = queue[index];
		// Old line slides up and fades; the next rises into its place.
		lineA.classList.add('above');
		lineB.classList.remove('below');
		const leaving = lineA;
		lineA = lineB;
		lineB = leaving;
		setTimeout(() => {
			// Park the old line underneath, without animating, ready for the next turn.
			leaving.classList.add('instant', 'below');
			leaving.classList.remove('above');
			void leaving.offsetHeight;
			leaving.classList.remove('instant');
		}, SLIDE_MS);
	}

	function stop() {
		clearTimeout(timer);
		timer = undefined;
	}

	function schedule(delay: number) {
		stop();
		timer = setTimeout(() => {
			timer = undefined;
			step();
			if (steps < MAX_STEPS) schedule(STEP_MS);
		}, delay);
	}

	const entry: Reel = {
		field,
		inLine: () => field.isConnected && field.value === '' && onScreen && !touched,
		run() {
			const free = document.activeElement !== field && !document.hidden;
			if (!free || reduced || steps >= MAX_STEPS) return stop();
			if (!timer) schedule(steps === 0 ? FIRST_STEP_MS : STEP_MS);
		},
		hold: stop
	};
	reels.add(entry);

	/** Shows or hides the reel for the field's value, then lets the reels decide who moves. */
	function sync() {
		reel.classList.toggle('hidden', field.value !== '');
		queueElection();
	}

	function onBlur() {
		if (field.value === '') touched = true;
		sync();
	}

	const onReset = () =>
		setTimeout(() => {
			touched = false;
			steps = 0;
			sync();
		});
	const resize = new ResizeObserver(fit);
	resize.observe(field);
	const visibility = new IntersectionObserver(([entry]) => {
		onScreen = entry.isIntersecting;
		sync();
	});
	visibility.observe(field);
	// Values set from code (a cleared reply box) fire no event, so check now and then too.
	const poll = setInterval(sync, 600);

	for (const type of ['focus', 'input', 'change'] as const) field.addEventListener(type, sync);
	field.addEventListener('blur', onBlur);
	field.form?.addEventListener('reset', onReset);
	document.addEventListener('visibilitychange', sync);
	fit();
	sync();

	return {
		update(newLines: readonly string[]) {
			queue = [queue[index], ...shuffled(newLines.filter((line) => line !== queue[index]))];
			index = 0;
		},
		destroy() {
			stop();
			reels.delete(entry);
			queueElection();
			clearInterval(poll);
			resize.disconnect();
			visibility.disconnect();
			for (const type of ['focus', 'input', 'change'] as const) {
				field.removeEventListener(type, sync);
			}
			field.removeEventListener('blur', onBlur);
			field.form?.removeEventListener('reset', onReset);
			document.removeEventListener('visibilitychange', sync);
			field.placeholder = ownPlaceholder;
			reel.remove();
		}
	};
}
