import { homeSettings, LOCALE } from '#lib/home.js';

/**
 * Money is whole cents everywhere (integers), and only turned into dollars (or pounds, or
 * euros) for display, in the home's currency (src/lib/home.ts; Australian dollars by default).
 */

// One formatter per currency and style, made when first needed: a server serves many homes.
const formatters = new Map<string, Intl.NumberFormat>();
function formatter(whole: boolean) {
	const { currency } = homeSettings();
	const key = `${currency}:${whole}`;
	let found = formatters.get(key);
	if (!found) {
		found = new Intl.NumberFormat(LOCALE, {
			style: 'currency',
			currency,
			// "£12", not "GBP 12": within a home's own app the plain sign is clear.
			currencyDisplay: 'narrowSymbol',
			...(whole ? { maximumFractionDigits: 0, minimumFractionDigits: 0 } : {})
		});
		formatters.set(key, found);
	}
	return found;
}

/** $1,234.50 (£1,234.50, €1,234.50…) */
export const formatMoney = (cents: number) => formatter(false).format(cents / 100);

/** $1,235, for chart labels where cents are noise. */
export const formatMoneyShort = (cents: number) => formatter(true).format(cents / 100);

/** The home's currency sign on its own, for beside an amount field: "$", "£", "€". */
export function currencySymbol() {
	return (
		formatter(false)
			.formatToParts(0)
			.find((part) => part.type === 'currency')?.value ?? '$'
	);
}

/**
 * Reads what someone typed ("120", "$1,234.5", "£12.05", "NZ$40") as cents, or null if it isn't
 * money. Currency signs, letters, spaces and thousands commas are ignored.
 */
export function parseMoney(value: string): number | null {
	const cleaned = value.replace(/[^\d.]/g, '');
	if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
	const [whole, fraction = ''] = cleaned.split('.');
	return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** Cents as an input value: 12000 → "120.00". */
export const centsToInput = (cents: number) => (cents / 100).toFixed(2);
