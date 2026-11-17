import ICAL from 'ical.js';
import { PLAN_LOCATION_MAX, PLAN_NOTES_MAX, PLAN_TITLE_MAX, type PlanInput } from './plan-input.js';
import { addDays, todayISO, zonedToInstant } from '#lib/time.js';

/**
 * Reads an Apple Calendar (.ics) export into plans: a one-time copy, not a sync.
 * One-off events are copied whenever they fall. Repeating events are copied only for the
 * next few months, because plans don't repeat yet.
 */

export const RECURRING_WINDOW_DAYS = 92;
const ONE_OFF_WINDOW_DAYS = 3 * 365;
const MAX_OCCURRENCES_PER_SERIES = 500;

export interface ImportedPlan extends PlanInput {
	/** Stable per event (and per occurrence for repeating ones), so re-importing skips it. */
	sourceUid: string;
}

export interface CalendarImport {
	calendarName: string | null;
	plans: ImportedPlan[];
	/** Event occurrences that had already finished. */
	pastCount: number;
}

const clip = (text: string, max: number) =>
	text.length > max ? `${text.slice(0, max - 1)}…` : text;

const dateISO = (time: ICAL.Time) =>
	`${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;

const clockOf = (time: ICAL.Time) =>
	`${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;

/** Floating times (no time zone) are read as household time; zoned and UTC times are exact. */
function instantOf(time: ICAL.Time): Date {
	if (time.isDate) return zonedToInstant(dateISO(time));
	if (!time.zone || time.zone.tzid === 'floating')
		return zonedToInstant(dateISO(time), clockOf(time));
	return time.toJSDate();
}

function toPlan(
	item: ICAL.Event,
	start: ICAL.Time,
	end: ICAL.Time | null,
	sourceUid: string
): ImportedPlan {
	const allDay = start.isDate;
	const description = (item.description ?? '').trim();
	const url = String(item.component.getFirstPropertyValue('url') ?? '').trim();
	const notes =
		url && !description.includes(url)
			? [description, url].filter(Boolean).join('\n\n')
			: description;
	const location = (item.location ?? '')
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.join(', ');

	let endsAt: string | null = null;
	if (end) {
		const startInstant = instantOf(start).getTime();
		const endInstant = instantOf(end).getTime();
		// A one-day all-day event ends at the next midnight; store nothing for that.
		const oneDay = allDay && dateISO(end) === addDays(dateISO(start), 1);
		if (endInstant > startInstant && !oneDay) endsAt = new Date(endInstant).toISOString();
	}

	return {
		title: clip((item.summary ?? '').trim() || 'Untitled', PLAN_TITLE_MAX),
		notes: clip(notes, PLAN_NOTES_MAX),
		location: clip(location, PLAN_LOCATION_MAX),
		allDay,
		startsAt: instantOf(start).toISOString(),
		endsAt,
		sourceUid
	};
}

export function parseCalendarFile(text: string, now = new Date()): CalendarImport {
	const root = new ICAL.Component(ICAL.parse(text));
	for (const zone of root.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(zone);

	const recurringUntil = zonedToInstant(addDays(todayISO(now), RECURRING_WINDOW_DAYS)).getTime();
	const oneOffUntil = zonedToInstant(addDays(todayISO(now), ONE_OFF_WINDOW_DAYS)).getTime();

	const components = root.getAllSubcomponents('vevent');
	const exceptions = components.filter((component) => component.hasProperty('recurrence-id'));
	const masters = components.filter((component) => !component.hasProperty('recurrence-id'));

	const plans = new Map<string, ImportedPlan>();
	let pastCount = 0;

	const keep = (plan: ImportedPlan, until: number) => {
		const starts = new Date(plan.startsAt).getTime();
		// All-day plans count until the end of their day; timed ones until they finish.
		const finishes = plan.endsAt
			? new Date(plan.endsAt).getTime()
			: plan.allDay
				? starts + 86_400_000
				: starts;
		if (finishes < now.getTime()) {
			pastCount += 1;
			return;
		}
		if (starts > until) return;
		plans.set(plan.sourceUid, plan);
	};

	for (const component of masters) {
		const event = new ICAL.Event(component);
		if (String(component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED')
			continue;

		for (const exception of exceptions) {
			if (exception.getFirstPropertyValue('uid') === event.uid) {
				event.relateException(new ICAL.Event(exception));
			}
		}

		if (!event.isRecurring()) {
			keep(toPlan(event, event.startDate, event.endDate ?? null, event.uid), oneOffUntil);
			continue;
		}

		const iterator = event.iterator();
		for (let count = 0; count < MAX_OCCURRENCES_PER_SERIES; count += 1) {
			const next = iterator.next();
			if (!next) break;
			if (instantOf(next).getTime() > recurringUntil) break;
			const occurrence = event.getOccurrenceDetails(next);
			const status = String(
				occurrence.item.component.getFirstPropertyValue('status') ?? ''
			).toUpperCase();
			if (status === 'CANCELLED') continue;
			const sourceUid = `${event.uid}@${occurrence.recurrenceId.toString()}`;
			keep(
				toPlan(occurrence.item, occurrence.startDate, occurrence.endDate ?? null, sourceUid),
				recurringUntil
			);
		}
	}

	const calendarName = root.getFirstPropertyValue('x-wr-calname');
	return {
		calendarName: calendarName ? String(calendarName) : null,
		plans: [...plans.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
		pastCount
	};
}
