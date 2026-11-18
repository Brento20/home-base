import { HOUSEHOLD_LOCALE, HOUSEHOLD_TIME_ZONE } from '#lib/config.js';

/**
 * Dates and times in the household's time zone, on the server (which may run in UTC)
 * and on the phone alike. Calendar dates are plain 'YYYY-MM-DD' strings.
 */

const zone = { timeZone: HOUSEHOLD_TIME_ZONE };

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
	...zone,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

/** The household-local calendar date and clock time of an instant. */
export function zonedParts(instant: Date) {
	const parts = Object.fromEntries(
		partsFormatter.formatToParts(instant).map((part) => [part.type, part.value])
	);
	return {
		date: `${parts.year}-${parts.month}-${parts.day}`,
		time: `${parts.hour}:${parts.minute}`
	};
}

export function todayISO(now = new Date()) {
	return zonedParts(now).date;
}

export function addDays(dateISO: string, days: number) {
	const [year, month, day] = dateISO.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day + days));
	return date.toISOString().slice(0, 10);
}

/** Whole days from a to b, both calendar dates. */
export function daysBetween(fromISO: string, toISO: string) {
	const toUtc = (iso: string) => {
		const [year, month, day] = iso.split('-').map(Number);
		return Date.UTC(year, month - 1, day);
	};
	return Math.round((toUtc(toISO) - toUtc(fromISO)) / 86_400_000);
}

/** Converts a household-local date and 'HH:MM' time to the real instant. */
export function zonedToInstant(dateISO: string, time = '00:00') {
	const [year, month, day] = dateISO.split('-').map(Number);
	const [hour, minute] = time.split(':').map(Number);
	const wallClock = Date.UTC(year, month - 1, day, hour, minute);
	// Guess with the offset at that wall-clock time, then correct once for DST edges.
	let instant = wallClock - offsetAt(new Date(wallClock));
	instant = wallClock - offsetAt(new Date(instant));
	return new Date(instant);
}

function offsetAt(instant: Date) {
	const { date, time } = zonedParts(instant);
	const [year, month, day] = date.split('-').map(Number);
	const [hour, minute] = time.split(':').map(Number);
	return (
		Date.UTC(year, month - 1, day, hour, minute) - Math.floor(instant.getTime() / 60_000) * 60_000
	);
}

export function isValidDateISO(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
}

export function isValidTime(value: string) {
	return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** "7:00 pm" */
export function formatClock(instant: Date) {
	const [hour, minute] = zonedParts(instant).time.split(':').map(Number);
	const suffix = hour >= 12 ? 'pm' : 'am';
	const displayHour = hour % 12 === 0 ? 12 : hour % 12;
	return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** 'HH:MM' (24-hour) as "6:30 pm". */
export function formatTimeOfDay(time: string) {
	const [hour, minute] = time.split(':').map(Number);
	const suffix = hour >= 12 ? 'pm' : 'am';
	const displayHour = hour % 12 === 0 ? 12 : hour % 12;
	return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** When a dinner is: "Tonight, 6:30 pm", "Tomorrow", "Thursday, 7:00 pm". */
export function formatDinnerWhen(dateISO: string, time: string | null, today = todayISO()) {
	const day = formatDayLabel(dateISO, today);
	const name = day === 'Today' ? 'Tonight' : day === 'Yesterday' ? 'Last night' : day;
	return time ? `${name}, ${formatTimeOfDay(time)}` : name;
}

const weekdayShort = new Intl.DateTimeFormat(HOUSEHOLD_LOCALE, {
	weekday: 'short',
	timeZone: 'UTC'
});
const weekdayLong = new Intl.DateTimeFormat(HOUSEHOLD_LOCALE, { weekday: 'long', timeZone: 'UTC' });
const monthShort = new Intl.DateTimeFormat(HOUSEHOLD_LOCALE, { month: 'short', timeZone: 'UTC' });
const monthLong = new Intl.DateTimeFormat(HOUSEHOLD_LOCALE, { month: 'long', timeZone: 'UTC' });

const asUtcDate = (dateISO: string) => new Date(`${dateISO}T00:00:00Z`);

/** "Today", "Tomorrow", "Yesterday", "Saturday" within the week, else "Sat 29 Nov". */
export function formatDayLabel(dateISO: string, today = todayISO()) {
	const offset = daysBetween(today, dateISO);
	if (offset === 0) return 'Today';
	if (offset === 1) return 'Tomorrow';
	if (offset === -1) return 'Yesterday';
	const date = asUtcDate(dateISO);
	if (offset > 1 && offset < 7) return weekdayLong.format(date);
	return `${weekdayShort.format(date)} ${date.getUTCDate()} ${monthShort.format(date)}`;
}

/** The Monday that starts the household's current week, as a calendar date. */
export function startOfWeekISO(today = todayISO()) {
	const weekday = asUtcDate(today).getUTCDay(); // 0 = Sunday
	return addDays(today, -((weekday + 6) % 7));
}

/** "Saturday 21 November", with the year added when it isn't this year. */
export function formatLongDate(dateISO: string, today = todayISO()) {
	const date = asUtcDate(dateISO);
	const base = `${weekdayLong.format(date)} ${date.getUTCDate()} ${monthLong.format(date)}`;
	return dateISO.slice(0, 4) === today.slice(0, 4) ? base : `${base} ${dateISO.slice(0, 4)}`;
}

/** "In 4 days", "In 3 weeks", "Today", "Tomorrow", or null for past days. */
export function describeDaysAway(dateISO: string, today = todayISO()) {
	const days = daysBetween(today, dateISO);
	if (days < 0) return null;
	if (days === 0) return 'Today';
	if (days === 1) return 'Tomorrow';
	if (days < 14) return `In ${days} days`;
	if (days < 60) return `In ${Math.round(days / 7)} weeks`;
	return `In ${Math.round(days / 30)} months`;
}

/** Short due label for a task: "Today", "Tomorrow", "Fri", "3 days ago", "21 Nov". */
export function formatDueLabel(dateISO: string, today = todayISO()) {
	const offset = daysBetween(today, dateISO);
	if (offset === 0) return 'Today';
	if (offset === 1) return 'Tomorrow';
	if (offset === -1) return 'Yesterday';
	if (offset < -1) return `${-offset} days ago`;
	const date = asUtcDate(dateISO);
	if (offset < 7) return weekdayShort.format(date);
	return `${date.getUTCDate()} ${monthShort.format(date)}`;
}

/** Heading on Today: { primary: "Tuesday 17", secondary: "November" } */
export function formatTodayHeading(now = new Date()) {
	const date = asUtcDate(todayISO(now));
	return {
		primary: `${weekdayLong.format(date)} ${date.getUTCDate()}`,
		secondary: monthLong.format(date)
	};
}

/** "in 3 hrs", "in 25 min", "now", or null when it's far off or long past. */
export function describeCountdown(startsAt: Date, now = new Date()) {
	const minutes = Math.round((startsAt.getTime() - now.getTime()) / 60_000);
	if (minutes < -15 || minutes > 12 * 60) return null;
	if (minutes <= 0) return 'now';
	if (minutes < 60) return `in ${minutes} min`;
	const hours = Math.round(minutes / 60);
	return `in ${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
}

/**
 * When a feed post or reply was written: "Just now", "12 min ago", "Today 7:40 pm",
 * "Yesterday 7:40 pm", "Mon 7:40 pm" within the week, else "12 Nov".
 */
export function formatPostTime(instant: Date, now = new Date()) {
	const minutes = Math.floor((now.getTime() - instant.getTime()) / 60_000);
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes} min ago`;
	const day = zonedParts(instant).date;
	const offset = daysBetween(day, todayISO(now));
	const clock = formatClock(instant);
	if (offset === 0) return `Today ${clock}`;
	if (offset === 1) return `Yesterday ${clock}`;
	const date = asUtcDate(day);
	if (offset < 7) return `${weekdayShort.format(date)} ${clock}`;
	const sameYear = day.slice(0, 4) === todayISO(now).slice(0, 4);
	return `${date.getUTCDate()} ${monthShort.format(date)}${sameYear ? '' : ` ${day.slice(0, 4)}`}`;
}
