import { listGroups } from '#lib/features/expenses/expenses.server.js';
import { getHousehold, myId } from '#lib/features/household/household.server.js';
import { listUpcomingPlans } from '#lib/features/plans/plans.server.js';
import { listTasksComingUp } from '#lib/features/tasks/tasks.server.js';
import { askForJson } from '#lib/server/ai.js';
import { todayISO } from '#lib/time.js';
import type { ExpenseGroupSummary, Plan, Profile, Task } from '#lib/types.js';
import {
	factsKey,
	numbersCheckOut,
	plainSummary,
	weekFacts,
	type DebtsWithYou,
	type WeekFacts
} from './week-summary.js';

/** Your settle-up amounts with each person, added up across groups: positive, they owe you. */
function debtsWithYou(groups: ExpenseGroupSummary[], me: string): DebtsWithYou {
	const debts: DebtsWithYou = new Map();
	for (const group of groups) {
		for (const debt of group.myDebts) {
			const other = debt.from === me ? debt.to : debt.from;
			const signed = debt.from === me ? -debt.cents : debt.cents;
			debts.set(other, (debts.get(other) ?? 0) + signed);
		}
	}
	return debts;
}

/** The day's facts from data Today has already loaded. */
export function weekSummary(
	locals: App.Locals,
	plans: Plan[],
	tasks: Task[],
	groups: ExpenseGroupSummary[],
	people: Profile[]
) {
	const me = myId(locals);
	const today = todayISO();
	const facts = weekFacts(plans, tasks, debtsWithYou(groups, me), people, me, today);
	return { facts, plain: plainSummary(facts), key: factsKey(facts, today) };
}

/** Loads everything itself, for the summary endpoint. */
export async function loadWeekSummary(locals: App.Locals) {
	const [plans, tasks, groups, { household }] = await Promise.all([
		listUpcomingPlans(locals, 20),
		listTasksComingUp(locals),
		listGroups(locals),
		getHousehold(locals)
	]);
	return weekSummary(locals, plans, tasks, groups, household.members);
}

const SYSTEM = `You write the one line under the date on a household app's Today screen. You're the cheeky housemate who's read the fridge whiteboard: Australian, warm, a bit of a stirrer, never mean. Speak to the reader as "you".

What makes a good line:
- Lead with today: the reader's chores (name the actual chore), tonight's dinner, today's plans. Mention the rest of the week only if today is quiet.
- If money is owed, give it a playful nudge with the exact name and amount: owing someone is a reason to skip a treat; being owed is a reason to remind them.
- A joke that comes from the actual task works best: the bathroom means rubber gloves, bins mean a midnight sprint, a big dinner means stretchy pants.
- One or two short sentences, at most 140 characters in all. At most one emoji, and only if it earns its place.

Rules:
- Use only the facts given. Never invent chores, plans, people, days or amounts.
- Keep every number and amount exactly as given. Words like "a couple" are fine; changed numbers are not.
- "cook": "you" means the reader is cooking; a name means that person is; "anyone" means nobody's claimed it.
- No guilt trips about health, weight, drinking problems or money troubles. Light teasing only.
- Don't start with "Hey", "Ah" or "Looks like". Don't use dashes.
- Keep responses short and punchy (up to 140 characters), like a cheeky housemate.

The style, for flavour only (don't copy it): "Grab the rubber gloves, you're on bathroom duty today plus 2 other jobs. Maybe skip that extra cocktail: you owe Chris $595."`;

/** A cheekier line from the same facts; null if the AI is off, doesn't answer, or makes things up. */
export async function friendlyLine(facts: WeekFacts, plain: string): Promise<string | null> {
	const answer = await askForJson<{ line: string }>({
		system: SYSTEM,
		content: `Facts: ${JSON.stringify(facts)}\nPlain version: ${plain}`,
		schema: {
			type: 'object',
			additionalProperties: false,
			required: ['line'],
			properties: { line: { type: 'string' } }
		},
		maxTokens: 250,
		timeoutMs: 12_000
	});
	const line = answer?.line.trim().replace(/\s*[—–]\s*/g, ', ');
	if (!line || line.length > 240) return null;
	// A number that isn't in the facts means it got something wrong: keep the plain line.
	return numbersCheckOut(line, facts) ? line : null;
}
