/**
 * Quick add for tasks: "bins out every Tuesday, Chris" → a title, who, when and how often, filled
 * into the add form for a person to check and add. Null when it can't be read; the typed words
 * stay in the field to finish by hand.
 */
import { askForJson, todayForPrompt } from '#lib/server/ai.js';
import { isValidDateISO } from '#lib/time.js';
import type { Profile } from '#lib/types.js';
import { REPEAT_UNITS, REPEATS, repeatFor, type Repeat, type RepeatUnit } from './repeat.js';

export interface TaskFormValues {
	title: string;
	assigneeId: string;
	due: 'none' | 'today' | 'tomorrow' | 'date';
	dueDate: string;
	repeat: Repeat;
}

interface AiTask {
	title: string;
	who: string;
	when: TaskFormValues['due'];
	date: string;
	repeat: Exclude<Repeat, `every-${string}`> | 'custom';
	every: number;
	unit: RepeatUnit;
}

export async function readTask(
	text: string,
	people: Profile[],
	me: Profile,
	today: string
): Promise<TaskFormValues | null> {
	const names = people.map((person) => person.displayName);
	const answer = await askForJson<AiTask>({
		system: `You turn a quick note into a household chore. Australian English.
Today is ${todayForPrompt(today)}. The person typing is ${me.displayName}. People at home: ${names.join(', ')}.
- title: the chore, short, sentence case, e.g. "Put the bins out". No names, days or "every week" in it.
- who: one of the people's names if the note says who (use ${me.displayName} for "me" or "I"), else "anyone".
- when: "today", "tomorrow", "date" (with date as YYYY-MM-DD) or "none". A weekday means the next one from today. For a repeating chore with no start, use its next due day.
- repeat: "weekly", "fortnightly", "monthly" or "none"; or "custom" for any other gap, with every and unit ("every 3 months" is custom, 3, months; "every day" is custom, 1, days; "yearly" is custom, 1, years). every and unit are ignored unless repeat is custom.`,
		content: text,
		schema: {
			type: 'object',
			additionalProperties: false,
			required: ['title', 'who', 'when', 'date', 'repeat', 'every', 'unit'],
			properties: {
				title: { type: 'string' },
				who: { type: 'string', enum: [...names, 'anyone'] },
				when: { type: 'string', enum: ['none', 'today', 'tomorrow', 'date'] },
				date: { type: 'string' },
				repeat: { type: 'string', enum: [...REPEATS.map((repeat) => repeat.key), 'custom'] },
				every: { type: 'integer' },
				unit: { type: 'string', enum: [...REPEAT_UNITS] }
			}
		},
		maxTokens: 300,
		timeoutMs: 15_000
	});
	if (!answer?.title.trim()) return null;

	const person = people.find((entry) => entry.displayName === answer.who);
	const dated = answer.when === 'date' && isValidDateISO(answer.date);
	return {
		title: answer.title.trim().slice(0, 160),
		assigneeId: person?.id ?? '',
		due: answer.when === 'date' && !dated ? 'none' : answer.when,
		dueDate: dated ? answer.date : '',
		repeat: answer.repeat === 'custom' ? repeatFor(answer.every, answer.unit) : answer.repeat
	};
}
