/**
 * Quick add for plans: "dinner with Sam at Fratelli Saturday 7" → a title, day, time and place,
 * filled into the new-plan form for a person to check and save. Null when it can't be read.
 */
import { askForJson, todayForPrompt } from '#lib/server/ai.js';
import { isValidDateISO, isValidTime } from '#lib/time.js';
import type { PlanFormValues } from './plan-input.js';
import { PLAN_LOCATION_MAX, PLAN_NOTES_MAX, PLAN_TITLE_MAX } from './plan-input.js';

/** With no time given, a plan starts at 7pm, as the form does. */
const DEFAULT_START = '19:00';

interface AiPlan {
	isPlan: boolean;
	title: string;
	date: string;
	allDay: boolean;
	startTime: string;
	endTime: string;
	location: string;
	notes: string;
}

export async function readPlan(text: string, today: string): Promise<PlanFormValues | null> {
	const answer = await askForJson<AiPlan>({
		system: `You turn a quick note into a plan on a shared household calendar. Australian English.
Today is ${todayForPrompt(today)}.
- isPlan: false if it isn't something happening on a day.
- title: short, sentence case, e.g. "Dinner with Sam". Leave the day, time and place out of it.
- date: YYYY-MM-DD. A weekday means the next one from today; "tonight" is today.
- allDay: true for things without a time, like a birthday or a trip.
- startTime and endTime: 24-hour HH:MM, or "" if not said. "7" for dinner means 19:00.
- location: the place if given, else "".
- notes: anything else worth keeping, else "".`,
		content: text,
		schema: {
			type: 'object',
			additionalProperties: false,
			required: ['isPlan', 'title', 'date', 'allDay', 'startTime', 'endTime', 'location', 'notes'],
			properties: {
				isPlan: { type: 'boolean' },
				title: { type: 'string' },
				date: { type: 'string' },
				allDay: { type: 'boolean' },
				startTime: { type: 'string' },
				endTime: { type: 'string' },
				location: { type: 'string' },
				notes: { type: 'string' }
			}
		},
		maxTokens: 400,
		timeoutMs: 15_000
	});
	if (!answer?.isPlan || !answer.title.trim()) return null;

	const time = (value: string) => (isValidTime(value) ? value : '');
	return {
		title: answer.title.trim().slice(0, PLAN_TITLE_MAX),
		notes: answer.notes.trim().slice(0, PLAN_NOTES_MAX),
		location: answer.location.trim().slice(0, PLAN_LOCATION_MAX),
		date: isValidDateISO(answer.date) ? answer.date : today,
		allDay: answer.allDay,
		startTime: answer.allDay ? '' : time(answer.startTime) || DEFAULT_START,
		endTime: answer.allDay ? '' : time(answer.endTime)
	};
}
