import { HOUSEHOLD_LOCALE } from '#lib/config.js';

/**
 * Money is whole cents everywhere (integers), and only turned into dollars for display.
 * Every amount is Australian dollars.
 */

const dollars = new Intl.NumberFormat(HOUSEHOLD_LOCALE, { style: 'currency', currency: 'AUD' });
const wholeDollars = new Intl.NumberFormat(HOUSEHOLD_LOCALE, {
	style: 'currency',
	currency: 'AUD',
	maximumFractionDigits: 0
});

/** $1,234.50 */
export const formatMoney = (cents: number) => dollars.format(cents / 100);

/** $1,235, for chart labels where cents are noise. */
export const formatMoneyShort = (cents: number) => wholeDollars.format(cents / 100);

/** Reads what someone typed ("120", "$1,234.5", "12.05") as cents, or null if it isn't money. */
export function parseMoney(value: string): number | null {
	const cleaned = value.replace(/[$,\s]/g, '');
	if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
	const [whole, fraction = ''] = cleaned.split('.');
	return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** Cents as an input value: 12000 → "120.00". */
export const centsToInput = (cents: number) => (cents / 100).toFixed(2);
