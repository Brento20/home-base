/**
 * The one-line look at the week under Today's date. The plain line is built from the household's
 * own data and always shows; when the AI is on, a friendlier line written from the same facts
 * swaps in after the page loads (src/routes/(app)/summary/+server.ts). The facts' `key` changes
 * only when they do, so the browser keeps the friendly line until something actually changes.
 */
import { formatMoneyShort } from '#lib/features/expenses/money.js';
import { addDays, zonedParts } from '#lib/time.js';
import type { Plan, Task } from '#lib/types.js';

export interface WeekFacts {
	/** Plans in the next seven days, soonest first: title and weekday. */
	plans: { title: string; day: string }[];
	/** Chores due by the end of the week, overdue ones included. */
	chores: number;
	/** How many of those are yours. */
	yourChores: number;
	/** Dinners planned this week, by recipe title. */
	dinners: string[];
	/** Across your money groups. Positive: you're owed. Negative: you owe. */
	netCents: number;
}

const weekday = (dateISO: string) =>
	new Date(`${dateISO}T12:00:00Z`).toLocaleDateString('en-AU', {
		weekday: 'long',
		timeZone: 'UTC'
	});

export function weekFacts(
	plans: Plan[],
	tasks: Task[],
	netCents: number,
	meId: string,
	today: string
): WeekFacts {
	const until = addDays(today, 6);
	const thisWeek = (date: string | null) => date !== null && date <= until;
	const chores = tasks.filter((task) => !task.recipeId && thisWeek(task.dueOn));

	return {
		plans: plans
			.map((plan) => ({ title: plan.title, date: zonedParts(new Date(plan.startsAt)).date }))
			.filter(({ date }) => date >= today && date <= until)
			.slice(0, 8)
			.map(({ title, date }) => ({ title, day: date === today ? 'today' : weekday(date) })),
		chores: chores.length,
		yourChores: chores.filter((task) => task.assigneeId === meId).length,
		dinners: tasks
			.filter((task) => task.recipe && thisWeek(task.dueOn) && task.dueOn! >= today)
			.map((task) => task.recipe!.title)
			.slice(0, 7),
		netCents
	};
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "This week: 2 plans, 5 chores (3 yours) and 2 dinners planned. You’re owed $42." */
export function plainSummary(facts: WeekFacts): string {
	const parts: string[] = [];
	if (facts.plans.length) parts.push(count(facts.plans.length, 'plan'));
	if (facts.chores)
		parts.push(
			`${count(facts.chores, 'chore')}${facts.yourChores ? ` (${facts.yourChores} yours)` : ''}`
		);
	if (facts.dinners.length) parts.push(`${count(facts.dinners.length, 'dinner')} planned`);

	const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
	const week = list ? `This week: ${list}.` : 'A quiet week ahead. Nothing planned yet.';

	const money =
		facts.netCents > 0
			? ` You’re owed ${formatMoneyShort(facts.netCents)}.`
			: facts.netCents < 0
				? ` You owe ${formatMoneyShort(-facts.netCents)}.`
				: '';
	return week + money;
}

/** A short fingerprint of the facts, for keeping the friendly line until they change. */
export function factsKey(facts: WeekFacts, today: string): string {
	const text = `${today}|${JSON.stringify(facts)}`;
	let hash = 0;
	for (let i = 0; i < text.length; i++) hash = (Math.imul(31, hash) + text.charCodeAt(i)) | 0;
	return (hash >>> 0).toString(36);
}
