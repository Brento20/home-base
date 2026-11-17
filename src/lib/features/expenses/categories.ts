/**
 * The categories an expense can be tagged with. Keys match the database check constraint in
 * supabase/migrations/20261118000000_expenses.sql; colours come from the chart tokens.
 */
export const CATEGORIES = [
	{ key: 'rent', label: 'Rent', colour: 'var(--chart-1)' },
	{ key: 'groceries', label: 'Groceries', colour: 'var(--chart-2)' },
	{ key: 'utilities', label: 'Utilities', colour: 'var(--chart-3)' },
	{ key: 'internet', label: 'Internet', colour: 'var(--chart-4)' },
	{ key: 'eating_out', label: 'Eating out', colour: 'var(--chart-5)' },
	{ key: 'events', label: 'Events', colour: 'var(--chart-6)' },
	{ key: 'transport', label: 'Transport', colour: 'var(--chart-7)' },
	{ key: 'household', label: 'Household', colour: 'var(--chart-8)' },
	{ key: 'other', label: 'Other', colour: 'var(--chart-other)' }
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]['key'];

const byKey = new Map<string, (typeof CATEGORIES)[number]>(CATEGORIES.map((c) => [c.key, c]));

export const isCategory = (value: string): value is CategoryKey => byKey.has(value);
export const categoryLabel = (key: string) => byKey.get(key)?.label ?? 'Other';
export const categoryColour = (key: string) => byKey.get(key)?.colour ?? 'var(--chart-other)';
