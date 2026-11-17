import { PLAN_TITLE_MAX } from '#lib/features/plans/plan-input.js';

/** How long a title taken from a post can be before it's cut at a word. */
const DRAFT_TITLE_MAX = 60;

/**
 * A plan draft from a feed post: its first line as the title (cut at a word if it's long), and
 * the whole post in the notes, so the plan remembers what was agreed.
 * "Anyone keen for dumplings Friday?" → title "Anyone keen for dumplings Friday?".
 */
export function draftFromPost(body: string) {
	const firstLine =
		body
			.split('\n')
			.find((line) => line.trim())
			?.trim() ?? '';
	let title = firstLine;
	if (title.length > DRAFT_TITLE_MAX) {
		const cut = title.slice(0, DRAFT_TITLE_MAX);
		title = `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 30)).trim()}…`;
	}
	return { title: title.slice(0, PLAN_TITLE_MAX), notes: body };
}
