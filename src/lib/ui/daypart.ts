import { HOUSEHOLD_LOCALE, HOUSEHOLD_TIME_ZONE } from '#lib/config.js';

/**
 * Shifts the colours with the time of day (morning, day, evening) in the household's time zone.
 * Add ?daypart=morning|day|evening to the URL to preview one.
 */

export type Daypart = 'morning' | 'day' | 'evening';

const DAYPARTS: Daypart[] = ['morning', 'day', 'evening'];

/** Cooler in the morning, neutral through the day, warmer from 5 pm. */
export function daypartAt(date = new Date()): Daypart {
	const hour = Number(
		new Intl.DateTimeFormat(HOUSEHOLD_LOCALE, {
			hour: 'numeric',
			hourCycle: 'h23',
			timeZone: HOUSEHOLD_TIME_ZONE
		}).format(date)
	);
	if (hour >= 5 && hour < 11) return 'morning';
	if (hour >= 11 && hour < 17) return 'day';
	return 'evening';
}

/** `?daypart=morning` previews a palette without waiting for the clock. */
export function applyDaypart() {
	const preview = new URLSearchParams(location.search).get('daypart') as Daypart | null;
	document.documentElement.dataset.daypart =
		preview && DAYPARTS.includes(preview) ? preview : daypartAt();
}
