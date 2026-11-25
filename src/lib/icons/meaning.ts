/**
 * Picks the icon that best means what a task or plan says, from the registry (registry.ts).
 *
 * It reads the sentence the way a person would, in parts:
 * - the verb: the first word, when it's something you do ("Play", "Water", "Pick up"). A word
 *   like "Drinks" isn't one: commands aren't plural.
 * - the subject: what the verb acts on ("pokemon" in "Play pokemon with chris").
 * - the context: anything after "with", "at", "for" and the like ("with chris", "at the pub").
 *   It leans, it doesn't decide, unless there's no subject at all ("Play with the dog").
 * - the kind of thing it is: a plan, a chore or a dinner.
 *
 * Then it scores every icon on all of it together and keeps the best, so the first word that
 * matches doesn't win by default:
 * - a named thing (an `entity`: "mario kart", "gta 6") counts most, 12;
 * - a subject the icon shows, 6 (2.5 when it's only in the context);
 * - the icon's verb, 3, and 2 more when the subject agrees or there's no subject to disagree;
 *   one of its `actions`, 6.5, a shade over any subject ("Vacuum the lounge");
 * - a context word the icon leans to, 1.5; the kind it's usually on, 1.
 * Longer phrases beat shorter ones a little. Under 4.5 it's not sure enough, and shows nothing:
 * a plain card beats a wrong picture. A dinner that matches nothing still gets the cooking pot.
 */
import { MEANINGS, type IconKind, type IconMeaning } from './registry.js';
import type { GlyphId } from './glyphs.js';

export interface IconPick {
	icon: GlyphId;
	score: number;
	/** What counted, for tests and for working out a surprising pick. */
	reasons: string[];
}

const ENTITY = 12;
const SUBJECT = 6;
const SUBJECT_IN_CONTEXT = 2.5;
const VERB = 3;
const ACTION = 6.5;
const VERB_AGREES = 2;
const CONTEXT = 1.5;
const KIND = 1;
const LONGER = 0.5;
const SURE_ENOUGH = 4.5;

/** Words that start a context rather than name the subject. */
const PREPOSITIONS = new Set([
	'with',
	'at',
	'for',
	'from',
	'to',
	'in',
	'on',
	'by',
	'near',
	'before',
	'after',
	'about',
	'into',
	'over',
	'around'
]);

const FILLER = new Set([
	'the',
	'a',
	'an',
	'and',
	'or',
	'my',
	'our',
	'your',
	'his',
	'her',
	'their',
	'some',
	'new',
	'all',
	'up',
	'out',
	'off',
	'this',
	'that',
	'next',
	'again',
	'please',
	'it',
	'them',
	'of'
]);

/** Common things to do, beyond the registry's own verbs, so the first word reads as one. */
const EVERYDAY_VERBS = [
	'take',
	'put',
	'get',
	'buy',
	'book',
	'call',
	'go',
	'do',
	'make',
	'fix',
	'clean',
	'check',
	'sort',
	'pick',
	'drop',
	'see',
	'show',
	'present',
	'plan',
	'finish',
	'start',
	'change',
	'replace',
	'return',
	'order',
	'find',
	'help',
	'tell',
	'ask',
	'remind',
	'give',
	'bring',
	'collect',
	'renew',
	'cancel',
	'update',
	'print',
	'sign',
	'send',
	'post',
	'reply',
	'pay',
	'play',
	'watch',
	'wash',
	'feed',
	'walk',
	'water',
	'read',
	'write',
	'cook',
	'bake',
	'eat',
	'drink',
	'visit',
	'meet',
	'have',
	'try',
	'learn',
	'practise',
	'practice',
	'organise',
	'switch',
	'turn',
	'set',
	'fill',
	'work',
	'stock',
	'catch',
	'hang',
	'grab',
	'empty',
	'load',
	'unload',
	'mow',
	'trim',
	'wrap',
	'host',
	'prep',
	'move',
	'pack'
];

/** Lower case, accents off, possessives off, hyphens split: "Chris's Pokémon" → "chris pokemon". */
export function normalise(text: string) {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/['’]s\b/g, '')
		.replace(/['’]/g, '')
		.replace(/[-_/]/g, ' ');
}

/**
 * A rough stem, the same for a word and its plurals and endings: dogs → dog, parties → parti,
 * running → run, baking and bake → bak. It only has to agree with itself, not be good English.
 */
export function stem(word: string) {
	let w = word;
	if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'i';
	else if (w.length > 4 && /(ches|shes|[sxz]es)$/.test(w)) w = w.slice(0, -2);
	else if (w.length > 3 && w.endsWith('s') && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
	if (w.length > 5 && w.endsWith('ing')) w = undouble(w.slice(0, -3));
	else if (w.length > 4 && w.endsWith('ed')) w = undouble(w.slice(0, -2));
	if (w.length > 2 && w.endsWith('y')) w = w.slice(0, -1) + 'i';
	if (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);
	return w;
}

function undouble(w: string) {
	return /([bdfgklmnprtz])\1$/.test(w) ? w.slice(0, -1) : w;
}

const words = (text: string) => normalise(text).match(/[a-z0-9&]+/g) ?? [];

/** A registry phrase, as stems. */
const phrase = (text: string) => words(text).map(stem);

interface Prepared extends IconMeaning {
	entityStems: string[][];
	subjectStems: string[][];
	verbStems: string[][];
	actionStems: string[][];
	contextStems: string[][];
}

const PREPARED: Prepared[] = MEANINGS.map((meaning) => ({
	...meaning,
	entityStems: (meaning.entities ?? []).map(phrase),
	subjectStems: (meaning.subjects ?? []).map(phrase),
	verbStems: (meaning.verbs ?? []).map(phrase),
	actionStems: (meaning.actions ?? []).map(phrase),
	contextStems: (meaning.contexts ?? []).map(phrase)
}));

/** Every word of every subject and named thing. */
const KNOWN = new Set(
	PREPARED.flatMap((meaning) => [...meaning.subjectStems, ...meaning.entityStems].flat())
);

/** Every verb anyone uses, as stem phrases, longest first so "pick up" beats "pick". */
const VERBS: string[][] = [
	...new Map(
		[
			...EVERYDAY_VERBS.map(phrase),
			...PREPARED.flatMap((meaning) => [...meaning.verbStems, ...meaning.actionStems])
		].map((stems) => [stems.join(' '), stems])
	).values()
].sort((a, b) => b.length - a.length);

/** Where a phrase sits in a run of stems, or -1. */
function find(stems: string[], target: string[]) {
	outer: for (let i = 0; i + target.length <= stems.length; i++) {
		for (let j = 0; j < target.length; j++) if (stems[i + j] !== target[j]) continue outer;
		return i;
	}
	return -1;
}

interface Reading {
	all: string[];
	verb: string[] | null;
	subject: string[];
	context: string[];
	text: string;
}

/** Splits a sentence into its verb, subject and context. */
export function read(text: string): Reading {
	const raw = words(text);
	const all = raw.map(stem);
	let verb: string[] | null = null;
	let start = 0;
	for (const candidate of VERBS) {
		if (find(all.slice(0, candidate.length), candidate) !== 0) continue;
		// A command isn't plural: "Drinks with Sam" is drinks, not "drink".
		const first = raw[0] ?? '';
		if (
			candidate.length === 1 &&
			first.endsWith('s') &&
			!first.endsWith('ss') &&
			stem(first) !== first
		)
			continue;
		verb = candidate;
		start = candidate.length;
		break;
	}
	const subject: string[] = [];
	const context: string[] = [];
	let inContext = false;
	for (let i = start; i < all.length; i++) {
		if (PREPOSITIONS.has(raw[i])) {
			inContext = true;
			continue;
		}
		if (FILLER.has(raw[i])) continue;
		(inContext ? context : subject).push(all[i]);
	}
	// Nothing before the context, or nothing the icons know (a name: "Pick up Chris from the
	// airport"), so the context is the subject: "Play with the dog".
	if (subject.length === 0 || !subject.some(known)) {
		return { all, verb, subject: [...subject, ...context], context: [], text };
	}
	return { all, verb, subject, context, text };
}

/** Whether any icon has a word for it. */
function known(word: string) {
	return KNOWN.has(word);
}

function score(meaning: Prepared, reading: Reading, kind: IconKind | undefined) {
	let total = 0;
	const reasons: string[] = [];
	let subjectHit = false;

	for (const entity of meaning.entityStems) {
		// A named thing that's just the verb ("Hang out the washing") is a verb, weighed below.
		if (reading.verb && entity.join(' ') === reading.verb.join(' ')) continue;
		if (find(reading.all, entity) >= 0) {
			total += ENTITY + LONGER * (entity.length - 1);
			reasons.push(`entity "${entity.join(' ')}"`);
			break;
		}
	}
	for (const pattern of meaning.patterns ?? []) {
		if (pattern.test(normalise(reading.text))) {
			total += ENTITY;
			reasons.push(`pattern ${pattern.source}`);
			break;
		}
	}
	let best = 0;
	let bestReason = '';
	for (const subject of meaning.subjectStems) {
		const value =
			find(reading.subject, subject) >= 0
				? SUBJECT
				: find(reading.context, subject) >= 0
					? SUBJECT_IN_CONTEXT
					: 0;
		const weighted = value && value + LONGER * (subject.length - 1);
		if (weighted > best) {
			best = weighted;
			bestReason = `${value === SUBJECT ? 'subject' : 'context subject'} "${subject.join(' ')}"`;
			subjectHit ||= value === SUBJECT;
		}
	}
	if (best) {
		total += best;
		reasons.push(bestReason);
	}
	const said = reading.verb?.join(' ');
	if (said && meaning.actionStems.some((action) => action.join(' ') === said)) {
		total += ACTION;
		reasons.push(`action "${said}"`);
		if (subjectHit) {
			total += VERB_AGREES;
			reasons.push('action and subject agree');
		}
	} else if (
		reading.verb &&
		[...meaning.verbStems, ...meaning.entityStems].some((verb) => verb.join(' ') === said)
	) {
		total += VERB;
		reasons.push(`verb "${reading.verb.join(' ')}"`);
		// The subject is this icon's too, or there's no subject to say otherwise.
		const unclaimed = reading.subject.length === 0 || !subjectOfAnother(meaning, reading);
		if (subjectHit || unclaimed) {
			total += VERB_AGREES;
			reasons.push(subjectHit ? 'verb and subject agree' : 'nothing else claims the subject');
		}
	}
	for (const context of meaning.contextStems) {
		if (find(reading.all, context) >= 0) {
			total += CONTEXT;
			reasons.push(`context "${context.join(' ')}"`);
			break;
		}
	}
	if (total > 0 && kind && meaning.kinds?.includes(kind)) {
		total += KIND;
		reasons.push(`usual on a ${kind}`);
	}
	return { total, reasons };
}

/** Whether some other icon claims a word of the subject, which a bare verb shouldn't override. */
function subjectOfAnother(meaning: Prepared, reading: Reading) {
	return PREPARED.some(
		(other) =>
			other !== meaning &&
			[...other.subjectStems, ...other.entityStems].some((term) => find(reading.subject, term) >= 0)
	);
}

/** The best icon for one piece of text, or null if none is a good enough fit. */
export function pickIcon(text: string, kind?: IconKind): IconPick | null {
	const reading = read(text);
	if (reading.all.length === 0) return null;
	let best: IconPick | null = null;
	for (const meaning of PREPARED) {
		const { total, reasons } = score(meaning, reading, kind);
		if (total > (best?.score ?? 0)) best = { icon: meaning.id, score: total, reasons };
	}
	return best && best.score >= SURE_ENOUGH ? best : null;
}

/** A plan's icon: from the title, then the notes. */
export function planIcon(plan: { title: string; notes?: string | null }): GlyphId | null {
	return (
		(pickIcon(plan.title, 'plan') ?? (plan.notes ? pickIcon(plan.notes, 'plan') : null))?.icon ??
		null
	);
}

/** A task's icon: a dinner from its dish (a pot if nothing closer), a chore from its title. */
export function taskIcon(task: {
	title: string;
	notes?: string | null;
	recipe?: { title: string } | null;
}): GlyphId | null {
	if (task.recipe) return pickIcon(task.recipe.title, 'dinner')?.icon ?? 'cooking-pot';
	return (
		(pickIcon(task.title, 'chore') ?? (task.notes ? pickIcon(task.notes, 'chore') : null))?.icon ??
		null
	);
}
