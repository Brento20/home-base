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

/**
 * A best guess at the category from what it was for, so the add form can fill it in as you type
 * and keep the category picker tucked away. Words, not substrings ("gas bill", not "Vegas"), the
 * names Australians say (Woolies, Bunnings, NBN, Opal), and null when nothing fits, so the form
 * keeps what it had. Earlier lists win: "Uber Eats" is eating out before "Uber" is transport.
 */
const CATEGORY_WORDS: [CategoryKey, string[]][] = [
	[
		'eating_out',
		[
			'uber eats',
			'menulog',
			'doordash',
			'deliveroo',
			'takeaway',
			'take away',
			'restaurant',
			'cafe',
			'café',
			'coffee',
			'coffees',
			'brunch',
			'lunch',
			'dinner',
			'breakfast',
			'pizza',
			'dumplings',
			'sushi',
			'ramen',
			'thai',
			'burgers',
			'pub',
			'bar',
			'drinks',
			'yum cha',
			'kebab'
		]
	],
	['rent', ['rent', 'bond', 'lease']],
	[
		'utilities',
		[
			'electricity',
			'electric',
			'power',
			'gas',
			'gas bill',
			'water',
			'water bill',
			'energy',
			'agl',
			'origin',
			'energyaustralia',
			'council rates',
			'rates',
			'strata'
		]
	],
	[
		'internet',
		[
			'internet',
			'nbn',
			'wifi',
			'wi-fi',
			'broadband',
			'phone',
			'mobile',
			'telstra',
			'optus',
			'vodafone'
		]
	],
	[
		'groceries',
		[
			'groceries',
			'grocery',
			'supermarket',
			'woolies',
			'woolworths',
			'coles',
			'aldi',
			'iga',
			'harris farm',
			'costco',
			'food shop',
			'shopping',
			'fruit',
			'veggies',
			'butcher',
			'bakery'
		]
	],
	[
		'events',
		[
			'tickets',
			'ticket',
			'concert',
			'gig',
			'movie',
			'movies',
			'cinema',
			'theatre',
			'show',
			'festival',
			'party',
			'birthday',
			'present',
			'gift',
			'wedding',
			'museum',
			'zoo'
		]
	],
	[
		'transport',
		[
			'uber',
			'taxi',
			'didi',
			'opal',
			'petrol',
			'fuel',
			'parking',
			'toll',
			'tolls',
			'train',
			'bus',
			'ferry',
			'rego',
			'car service',
			'flight',
			'flights'
		]
	],
	[
		'household',
		[
			'bunnings',
			'ikea',
			'kmart',
			'target',
			'cleaning',
			'cleaner',
			'cleaning supplies',
			'toilet paper',
			'furniture',
			'plumber',
			'electrician',
			'repairs',
			'hardware',
			'homewares',
			'laundry',
			'detergent',
			'plants'
		]
	]
];

const wordsOf = (text: string) =>
	` ${text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/['’]s\b/g, '')
		.replace(/[^a-z0-9-]+/g, ' ')
		.trim()} `;

export function guessCategory(text: string): CategoryKey | null {
	const words = wordsOf(text);
	if (words.trim() === '') return null;
	for (const [key, phrases] of CATEGORY_WORDS) {
		if (phrases.some((phrase) => words.includes(` ${wordsOf(phrase).trim()} `))) return key;
	}
	return null;
}
