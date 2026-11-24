/**
 * The line under Today's date. The plain line is built from the household's own data and always
 * shows; when the AI is on, a cheekier line written from the same facts swaps in after the page
 * loads (src/routes/(app)/summary/+server.ts). The facts' `key` changes only when they do (a new
 * or ticked task, a plan, a dinner, a different balance) or the day ticks over, so the browser
 * keeps the line until then: at most one AI call a day unless something changes.
 */
import { formatMoneyShort } from '#lib/features/expenses/money.js';
import { addDays, zonedParts } from '#lib/time.js';
import type { Plan, Profile, Task } from '#lib/types.js';

export interface MoneyLine {
	name: string;
	/** Already formatted ("$595"), so the line can't get the number wrong. */
	amount: string;
}

export interface WeekFacts {
	/** Who's reading: the line talks to them as "you". */
	you: string;
	today: {
		/** Your chores due today or overdue, by title. */
		yourChores: string[];
		/** How many of those are overdue. */
		overdue: number;
		/** Up-for-grabs chores ("Anyone") due today or overdue, by title. */
		anyoneChores: string[];
		plans: string[];
		/** Tonight's dinner and who's cooking ("you", a name, or "anyone"). */
		dinner: { recipe: string; cook: string } | null;
	};
	week: {
		/** Plans after today, this week: title and weekday. */
		plans: { title: string; day: string }[];
		/** Your chores later this week. */
		yourChoresLater: number;
		/** Everyone else's chores this week, today included. */
		othersChores: number;
		/** Dinners planned after tonight. */
		dinnersLater: number;
	};
	money: {
		youOwe: MoneyLine[];
		owedToYou: MoneyLine[];
	};
}

/** Who owes whom across your money groups, from your side: positive, they owe you. */
export type DebtsWithYou = Map<string, number>;

const weekday = (dateISO: string) =>
	new Date(`${dateISO}T12:00:00Z`).toLocaleDateString('en-AU', {
		weekday: 'long',
		timeZone: 'UTC'
	});

export function weekFacts(
	plans: Plan[],
	tasks: Task[],
	debts: DebtsWithYou,
	people: Profile[],
	meId: string,
	today: string
): WeekFacts {
	const until = addDays(today, 6);
	const nameOf = (id: string | null) =>
		id === meId ? 'you' : (people.find((person) => person.id === id)?.displayName ?? 'anyone');

	const chores = tasks.filter((task) => !task.recipeId && task.dueOn && task.dueOn <= until);
	const dueNow = chores.filter((task) => task.dueOn! <= today);
	const mineNow = dueNow.filter((task) => task.assigneeId === meId);
	const tonight = tasks.find((task) => task.recipe && task.dueOn === today);

	const planDays = plans
		.map((plan) => ({ title: plan.title, date: zonedParts(new Date(plan.startsAt)).date }))
		.filter(({ date }) => date >= today && date <= until);

	const money: WeekFacts['money'] = { youOwe: [], owedToYou: [] };
	for (const [id, cents] of debts) {
		if (Math.abs(cents) < 100) continue; // Under a dollar isn't worth a joke.
		const line = { name: nameOf(id), amount: formatMoneyShort(Math.abs(cents)) };
		(cents > 0 ? money.owedToYou : money.youOwe).push(line);
	}

	return {
		you: people.find((person) => person.id === meId)?.displayName ?? 'you',
		today: {
			yourChores: mineNow.map((task) => task.title).slice(0, 6),
			overdue: mineNow.filter((task) => task.dueOn! < today).length,
			anyoneChores: dueNow
				.filter((task) => !task.assigneeId)
				.map((task) => task.title)
				.slice(0, 4),
			plans: planDays
				.filter(({ date }) => date === today)
				.map(({ title }) => title)
				.slice(0, 4),
			dinner: tonight ? { recipe: tonight.recipe!.title, cook: nameOf(tonight.assigneeId) } : null
		},
		week: {
			plans: planDays
				.filter(({ date }) => date > today)
				.slice(0, 6)
				.map(({ title, date }) => ({ title, day: weekday(date) })),
			yourChoresLater: chores.filter((task) => task.assigneeId === meId && task.dueOn! > today)
				.length,
			othersChores: chores.filter((task) => task.assigneeId && task.assigneeId !== meId).length,
			dinnersLater: tasks.filter(
				(task) => task.recipe && task.dueOn && task.dueOn > today && task.dueOn <= until
			).length
		},
		money
	};
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const joinAnd = (parts: string[]) =>
	parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : (parts[0] ?? '');

/** About two lines of Today's summary on a phone. */
export const PLAIN_MAX = 90;

/**
 * The plain version, always there: "Today: Clean the bathroom and 2 more tasks. Chris is
 * cooking chicken biryani. You owe Chris $595." It shows on two lines, so after the first
 * sentence, any that would run past PLAIN_MAX are left out (a shorter one after can still fit).
 */
export function plainSummary(facts: WeekFacts): string {
	const sentences: string[] = [];
	const { today, week, money } = facts;

	const mine = today.yourChores;
	if (mine.length)
		sentences.push(
			`Today: ${mine[0]}${mine.length > 1 ? ` and ${count(mine.length - 1, 'more task')}` : ''}.`
		);
	if (today.plans.length) sentences.push(`On today: ${joinAnd(today.plans)}.`);
	if (today.dinner)
		sentences.push(
			today.dinner.cook === 'you'
				? `You’re cooking ${today.dinner.recipe} tonight.`
				: today.dinner.cook === 'anyone'
					? `${today.dinner.recipe} is on tonight.`
					: `${today.dinner.cook} is cooking ${today.dinner.recipe} tonight.`
		);
	if (!sentences.length) {
		const later = [
			week.plans.length ? count(week.plans.length, 'plan') : '',
			week.yourChoresLater ? count(week.yourChoresLater, 'chore') : ''
		].filter(Boolean);
		sentences.push(
			later.length
				? `Nothing due today. This week: ${joinAnd(later)}.`
				: 'A quiet day. Nothing due.'
		);
	}

	const owe = money.youOwe.map((line) => `${line.name} ${line.amount}`);
	const owed = money.owedToYou.map((line) => `${line.name} owes you ${line.amount}`);
	if (owe.length) sentences.push(`You owe ${joinAnd(owe)}.`);
	if (owed.length) sentences.push(`${joinAnd(owed)}.`);

	let line = sentences[0] ?? '';
	for (const sentence of sentences.slice(1)) {
		if (line.length + 1 + sentence.length <= PLAIN_MAX) line += ` ${sentence}`;
	}
	return line;
}

/** A short fingerprint of the day and its facts: the friendly line is kept until it changes. */
export function factsKey(facts: WeekFacts, today: string): string {
	const text = `${today}|${JSON.stringify(facts)}`;
	let hash = 0;
	for (let i = 0; i < text.length; i++) hash = (Math.imul(31, hash) + text.charCodeAt(i)) | 0;
	return (hash >>> 0).toString(36);
}

/**
 * Whether every number in the AI's line is one from the facts (a count, an amount, a date),
 * so it can't make up "3 chores" or "$600".
 */
export function numbersCheckOut(line: string, facts: WeekFacts): boolean {
	const plainNumbers = (text: string) => text.replace(/(\d),(?=\d{3})/g, '$1').match(/\d+/g) ?? [];
	const known = new Set(plainNumbers(JSON.stringify(facts)));
	const counts = [
		facts.today.yourChores.length,
		facts.today.yourChores.length - 1,
		facts.today.anyoneChores.length,
		facts.today.plans.length,
		facts.week.plans.length
	];
	for (const n of counts) if (n > 0) known.add(String(n));
	return plainNumbers(line).every((n) => known.has(n));
}
