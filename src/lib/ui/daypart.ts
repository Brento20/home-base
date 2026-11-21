import { homeSettings, LOCALE } from '#lib/home.js';
import { paintTheme, themeFromCookies } from './theme.js';

/**
 * Shifts the colours with the time of day (morning, day, evening) in the household's time zone,
 * using the theme this device picked for each (theme.ts). Add ?daypart=morning|day|evening to
 * the URL to preview one.
 */

export type Daypart = 'morning' | 'day' | 'evening';

const DAYPARTS: Daypart[] = ['morning', 'day', 'evening'];

/** Cooler in the morning, neutral through the day, warmer from 5 pm. */
export function daypartAt(date = new Date()): Daypart {
	const hour = Number(
		new Intl.DateTimeFormat(LOCALE, {
			hour: 'numeric',
			hourCycle: 'h23',
			timeZone: homeSettings().timeZone
		}).format(date)
	);
	if (hour >= 5 && hour < 11) return 'morning';
	if (hour >= 11 && hour < 17) return 'day';
	return 'evening';
}

/** The part of the day showing now: the clock, or `?daypart=morning` to preview one. */
export function currentDaypart(): Daypart {
	const preview = new URLSearchParams(location.search).get('daypart') as Daypart | null;
	return preview && DAYPARTS.includes(preview) ? preview : daypartAt();
}

/** Puts this device's theme for the time of day on the page (run on a timer, so it moves on). */
export function applyDaypart() {
	paintTheme(themeFromCookies(document.cookie), currentDaypart());
}
