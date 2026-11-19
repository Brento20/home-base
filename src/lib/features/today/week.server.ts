import { listGroups } from '#lib/features/expenses/expenses.server.js';
import { myId } from '#lib/features/household/household.server.js';
import { listUpcomingPlans } from '#lib/features/plans/plans.server.js';
import { listTasksComingUp } from '#lib/features/tasks/tasks.server.js';
import { askForJson } from '#lib/server/ai.js';
import { todayISO } from '#lib/time.js';
import type { ExpenseGroupSummary, Plan, Task } from '#lib/types.js';
import { factsKey, plainSummary, weekFacts, type WeekFacts } from './week-summary.js';

/** The week's facts from data Today has already loaded. */
export function weekSummary(
	locals: App.Locals,
	plans: Plan[],
	tasks: Task[],
	groups: ExpenseGroupSummary[]
) {
	const netCents = groups.reduce((sum, group) => sum + group.myNetCents, 0);
	const today = todayISO();
	const facts = weekFacts(plans, tasks, netCents, myId(locals), today);
	return { facts, plain: plainSummary(facts), key: factsKey(facts, today) };
}

/** Loads everything itself, for the summary endpoint. */
export async function loadWeekSummary(locals: App.Locals) {
	const [plans, tasks, groups] = await Promise.all([
		listUpcomingPlans(locals, 20),
		listTasksComingUp(locals),
		listGroups(locals)
	]);
	return weekSummary(locals, plans, tasks, groups);
}

/** A friendlier line from the same facts; null if the AI is off or doesn't answer. */
export async function friendlyLine(facts: WeekFacts, plain: string): Promise<string | null> {
	const answer = await askForJson<{ line: string }>({
		system: `You write the one line under the date on a household app's home screen, about the week ahead. Australian English, warm and a little playful, like a housemate. Speak to the reader as "you".
- One sentence, two at most, under 140 characters.
- Use only the facts given. Never invent plans, people, days or amounts, and keep every number exact.
- Name one or two plans or dinners if it helps. At most one emoji.`,
		content: `Facts: ${JSON.stringify(facts)}\nPlain version: ${plain}`,
		schema: {
			type: 'object',
			additionalProperties: false,
			required: ['line'],
			properties: { line: { type: 'string' } }
		},
		maxTokens: 200,
		timeoutMs: 12_000
	});
	const line = answer?.line.trim();
	return line && line.length <= 220 ? line : null;
}
