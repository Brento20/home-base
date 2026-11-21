/**
 * Where a home is: its time zone (for "today", due dates, the time of day the colours follow)
 * and its currency. Each home sets its own in Home settings; Sydney and Australian dollars until
 * then. The app's wording and date style stay Australian English (LOCALE) whatever the home.
 *
 * Shared by the server and the phone. Code anywhere reads `homeSettings()`:
 *   - on the server, hooks.server.ts points it at the current request's home (each request is a
 *     different household, so it can't be one shared value), via setHomeSettingsSource;
 *   - on the phone, the app layout sets it once from the page data (setHomeSettings), so a page
 *     hydrates with exactly what the server rendered.
 */

export interface HomeSettings {
	/** An IANA time zone, such as 'Australia/Sydney'. */
	timeZone: string;
	/** An ISO 4217 code with cents, such as 'AUD'. */
	currency: string;
}

export const DEFAULT_HOME: HomeSettings = { timeZone: 'Australia/Sydney', currency: 'AUD' };

/** The app's language and date style, everywhere. */
export const LOCALE = 'en-AU';

let current: HomeSettings = DEFAULT_HOME;
let source: () => HomeSettings = () => current;

/** The home whose dates and money are being shown right now. */
export const homeSettings = (): HomeSettings => source();

/** The phone: which home this app is showing. */
export function setHomeSettings(settings: HomeSettings) {
	current = settings;
}

/** The server: where to find the current request's home. */
export function setHomeSettingsSource(read: () => HomeSettings) {
	source = read;
}

export function isTimeZone(value: string) {
	if (!value) return false;
	try {
		new Intl.DateTimeFormat('en', { timeZone: value });
		return true;
	} catch {
		return false;
	}
}

/**
 * Currencies a home can pick: ones with cents, since every amount is stored as whole cents.
 * Most likely first for this app (Australia and New Zealand), then alphabetical.
 */
export const CURRENCIES = [
	{ code: 'AUD', name: 'Australian dollar' },
	{ code: 'NZD', name: 'New Zealand dollar' },
	{ code: 'CAD', name: 'Canadian dollar' },
	{ code: 'CHF', name: 'Swiss franc' },
	{ code: 'EUR', name: 'Euro' },
	{ code: 'GBP', name: 'British pound' },
	{ code: 'HKD', name: 'Hong Kong dollar' },
	{ code: 'SGD', name: 'Singapore dollar' },
	{ code: 'USD', name: 'US dollar' },
	{ code: 'ZAR', name: 'South African rand' }
] as const;

export const isCurrency = (value: string) => CURRENCIES.some((currency) => currency.code === value);

/** Every time zone the device knows, for the picker; Sydney alone where it can't list them. */
export function timeZones(): string[] {
	const list = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
	return list ? list('timeZone') : [DEFAULT_HOME.timeZone];
}

/** Reads a home's row, falling back to the default for anything missing or unknown. */
export function homeFrom(row: { time_zone?: string | null; currency?: string | null } | null) {
	return {
		timeZone: row?.time_zone && isTimeZone(row.time_zone) ? row.time_zone : DEFAULT_HOME.timeZone,
		currency: row?.currency && isCurrency(row.currency) ? row.currency : DEFAULT_HOME.currency
	};
}
