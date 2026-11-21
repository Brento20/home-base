import library from '#lib/features/recipes/library.json';
import { cookTitle, scaleIngredients, type Recipe } from '#lib/features/recipes/recipe.js';
import { addDays, todayISO, zonedToInstant } from '#lib/time.js';
import type {
	CookDinner,
	AccountDetails,
	Expense,
	ExpenseGroup,
	FeedPost,
	HomeNote,
	Household,
	Plan,
	Profile,
	Settlement,
	ShoppingList,
	Task
} from '#lib/types.js';

/**
 * In-memory household used when Supabase isn't configured yet.
 * It resets whenever the dev server restarts.
 */
export const sampleProfiles: Profile[] = [
	{
		id: 'sample-brenton',
		displayName: 'Brenton',
		initials: 'B',
		accentColour: '#e58440',
		avatarUrl: null
	},
	{
		id: 'sample-chris',
		displayName: 'Chris',
		initials: 'C',
		accentColour: '#d6dce2',
		avatarUrl: null
	}
];

/** The sample signed-in person's profile form. */
export const sampleAccount: AccountDetails = {
	email: 'brenton@example.com',
	firstName: 'Brenton',
	lastName: 'Weaver',
	nickname: 'Brenton',
	pronouns: 'he/him',
	dateOfBirth: '',
	avatarUrl: null,
	accentColour: '#e58440'
};

const [brenton, chris] = sampleProfiles;

export const sampleHousehold: Household = {
	id: 'sample-household',
	name: 'home base',
	members: sampleProfiles,
	ownerIds: [sampleProfiles[0].id, sampleProfiles[1].id]
};

export const sampleNotes: HomeNote[] = [
	{
		id: crypto.randomUUID(),
		title: 'Wifi',
		body: 'Network: homebase\nPassword: correct-horse-battery',
		isSecret: true,
		updatedAt: new Date().toISOString()
	},
	{
		id: crypto.randomUUID(),
		title: 'Bins',
		body: 'Red bin every Tuesday night. Yellow and green swap weeks.',
		isSecret: false,
		updatedAt: new Date().toISOString()
	},
	{
		id: crypto.randomUUID(),
		title: 'Plumber',
		body: 'Dave · 0412 345 678',
		isSecret: false,
		updatedAt: new Date().toISOString()
	},
	{
		id: crypto.randomUUID(),
		title: 'Agent',
		body: 'Priya at Harbour Realty · (02) 9555 0134',
		isSecret: false,
		updatedAt: new Date().toISOString()
	}
];

const today = todayISO();
const item = (name: string, checked: boolean, createdBy: string) => ({
	id: crypto.randomUUID(),
	name,
	checked,
	createdBy
});

export const sampleLists: ShoppingList[] = [
	{
		id: crypto.randomUUID(),
		name: 'Groceries',
		pinned: true,
		completedAt: null,
		items: [
			item('Limes', false, brenton.id),
			item('Sourdough', false, chris.id),
			item('Oat milk', true, chris.id)
		]
	},
	{
		id: crypto.randomUUID(),
		name: 'Hardware run',
		pinned: false,
		completedAt: null,
		items: [item('Picture hooks', false, brenton.id), item('Sandpaper', false, brenton.id)]
	},
	{
		id: crypto.randomUUID(),
		name: 'Party supplies',
		pinned: false,
		completedAt: zonedToInstant(addDays(today, -3), '15:20').toISOString(),
		items: [item('Ice', true, chris.id), item('Candles', true, brenton.id)]
	}
];

const task = (
	title: string,
	assigneeId: string | null,
	dueOn: string | null,
	repeat: Task['repeat'] = 'none'
): Task => ({
	id: crypto.randomUUID(),
	title,
	notes: '',
	assigneeId,
	dueOn,
	repeat,
	completedAt: null,
	completedBy: null,
	createdBy: brenton.id,
	dueTime: null,
	recipeId: null,
	servings: null,
	recipe: null
});

export const sampleTasks: Task[] = [
	task('Put the bins out', brenton.id, today, 'weekly'),
	task('Pick up groceries', chris.id, today),
	task('Vacuum the lounge', null, addDays(today, 2), 'weekly'),
	task('Book the car service', null, addDays(today, 3)),
	task('Water the herbs', chris.id, null),
	{
		...task('Change the bed sheets', chris.id, addDays(today, -1), 'weekly'),
		completedAt: zonedToInstant(addDays(today, -1), '10:05').toISOString(),
		completedBy: chris.id
	}
];

// Plan dinner ---------------------------------------------------------------------------------

const libraryRecipe = (id: string) =>
	(library as Omit<Recipe, 'custom'>[]).find((r) => r.id === id)!;

const dinner = (
	recipeId: string,
	cook: string,
	dayOffset: number,
	time: string | null
): CookDinner => {
	const recipe = libraryRecipe(recipeId);
	return {
		...task(cookTitle(recipe.title), cook, addDays(today, dayOffset)),
		dueTime: time,
		recipeId,
		servings: 2,
		recipe: {
			title: recipe.title,
			servings: 2,
			ingredients: scaleIngredients(recipe, 2),
			steps: recipe.steps
		}
	};
};

// Last night's biryani (cooked, so Plan dinner asks how it was) and tonight's bolognese.
sampleTasks.push(
	{
		...dinner('recipe_037', chris.id, -1, '18:30'),
		completedAt: zonedToInstant(addDays(today, -1), '19:40').toISOString(),
		completedBy: chris.id
	},
	dinner('recipe_008', brenton.id, 0, '18:30')
);

/** Recipes added at home (the library itself ships with the app). */
export const sampleHomeRecipes: Recipe[] = [];

export const sampleRatings: { recipeId: string; profileId: string; stars: number }[] = [
	{ recipeId: 'recipe_008', profileId: brenton.id, stars: 5 },
	{ recipeId: 'recipe_008', profileId: chris.id, stars: 4 },
	{ recipeId: 'recipe_037', profileId: chris.id, stars: 5 }
];

/** `${taskId}:${profileId}` for each "How was it?" answered. */
export const sampleCheckins = new Set<string>();

const plan = (
	title: string,
	dayOffset: number,
	time: string | null,
	notes = '',
	location = ''
): Plan => {
	const date = addDays(today, dayOffset);
	return {
		id: crypto.randomUUID(),
		title,
		notes,
		location,
		startsAt: zonedToInstant(date, time ?? '00:00').toISOString(),
		endsAt: null,
		allDay: time === null
	};
};

export const samplePlans: Plan[] = [
	plan('Dinner at home', 0, '19:00', 'Brenton’s cooking'),
	plan('Saturday markets', 4, '09:00', '', 'Carriageworks'),
	plan('Chris’s birthday', 9, null),
	plan('Dinner booking', 11, '19:30', 'Table for 4', 'Firedoor')
];

/** Calendar events already imported in sample mode, so a second import adds nothing. */
export const sampleImportedUids = new Set<string>();

/**
 * Two expense groups with about three months of history, so balances and reports have something
 * to show. Dates are relative to today.
 */
export const sampleExpenseGroups: ExpenseGroup[] = [
	{ id: 'sample-group-place', name: 'Our Place', memberIds: [brenton.id, chris.id] },
	{ id: 'sample-group-car', name: 'Car', memberIds: [brenton.id, chris.id] }
];

const halves = (amountCents: number) => [
	{ profileId: brenton.id, owedCents: Math.ceil(amountCents / 2), input: null },
	{ profileId: chris.id, owedCents: Math.floor(amountCents / 2), input: null }
];

const sampleExpense = (
	groupId: string,
	daysAgo: number,
	description: string,
	amountCents: number,
	category: Expense['category'],
	paidBy: string
): Expense => ({
	id: crypto.randomUUID(),
	groupId,
	description,
	amountCents,
	paidBy,
	spentOn: addDays(today, -daysAgo),
	category,
	splitMethod: 'equal',
	shares: halves(amountCents),
	createdAt: zonedToInstant(addDays(today, -daysAgo), '12:00').toISOString()
});

const place = 'sample-group-place';
const car = 'sample-group-car';

export const sampleExpenses: Expense[] = [
	sampleExpense(place, 1, 'Groceries', 12000, 'groceries', brenton.id),
	sampleExpense(place, 3, 'Internet', 4000, 'internet', chris.id),
	sampleExpense(place, 6, 'Dumplings', 6400, 'eating_out', brenton.id),
	sampleExpense(place, 9, 'Groceries', 9850, 'groceries', chris.id),
	sampleExpense(place, 12, 'Rent', 180000, 'rent', brenton.id),
	sampleExpense(place, 15, 'Electricity', 21460, 'utilities', chris.id),
	sampleExpense(place, 19, 'Cleaning supplies', 3890, 'household', brenton.id),
	sampleExpense(place, 24, 'Concert tickets', 15800, 'events', chris.id),
	sampleExpense(place, 31, 'Groceries', 14320, 'groceries', brenton.id),
	sampleExpense(place, 34, 'Internet', 4000, 'internet', chris.id),
	sampleExpense(place, 42, 'Rent', 180000, 'rent', brenton.id),
	sampleExpense(place, 45, 'Groceries', 8760, 'groceries', chris.id),
	sampleExpense(place, 50, 'Pizza night', 5200, 'eating_out', chris.id),
	sampleExpense(place, 58, 'Groceries', 11240, 'groceries', brenton.id),
	sampleExpense(place, 64, 'Internet', 4000, 'internet', chris.id),
	sampleExpense(place, 72, 'Rent', 180000, 'rent', brenton.id),
	sampleExpense(place, 77, 'Gas bill', 9630, 'utilities', chris.id),
	sampleExpense(place, 83, 'Groceries', 10450, 'groceries', brenton.id),
	sampleExpense(car, 5, 'Petrol', 8200, 'transport', chris.id),
	sampleExpense(car, 26, 'Rego', 41200, 'transport', brenton.id),
	sampleExpense(car, 48, 'Petrol', 7650, 'transport', brenton.id)
];

const sampleSettlement = (
	groupId: string,
	daysAgo: number,
	paidBy: string,
	paidTo: string,
	amountCents: number
): Settlement => ({
	id: crypto.randomUUID(),
	groupId,
	paidBy,
	paidTo,
	amountCents,
	paidOn: addDays(today, -daysAgo),
	createdAt: zonedToInstant(addDays(today, -daysAgo), '18:00').toISOString()
});

export const sampleSettlements: Settlement[] = [
	sampleSettlement(place, 10, chris.id, brenton.id, 80000),
	sampleSettlement(place, 40, chris.id, brenton.id, 85000)
];

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

// A stand-in for a photo, drawn rather than shipped, so sample mode has a photo post to lay out.
const samplePhoto = `data:image/svg+xml,${encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2f22"/><stop offset="1" stop-color="#1c1411"/></linearGradient><radialGradient id="g" cx=".5" cy=".42" r=".5"><stop offset="0" stop-color="#ffd59a" stop-opacity=".9"/><stop offset="1" stop-color="#ffd59a" stop-opacity="0"/></radialGradient></defs><rect width="400" height="300" fill="url(#w)"/><circle cx="200" cy="126" r="120" fill="url(#g)"/><path d="M150 140h100l-22-62h-56z" fill="#f2c48d"/><rect x="196" y="140" width="8" height="96" fill="#2a1d17"/><ellipse cx="200" cy="240" rx="46" ry="9" fill="#2a1d17"/><rect y="250" width="400" height="50" fill="#120d0b"/></svg>`
)}`;

/** The home feed in sample mode: newest last here, sorted when listed. */
export const sampleFeedPosts: FeedPost[] = [
	{
		id: 'sample-post-lamp',
		authorId: chris.id,
		body: 'Found a lamp for the reading corner. Thoughts?',
		photoUrl: samplePhoto,
		createdAt: minutesAgo(60 * 26),
		reactions: [{ profileId: brenton.id, reaction: 'heart' }],
		replies: [
			{
				id: 'sample-reply-lamp',
				authorId: brenton.id,
				body: 'Love it. Goes with the rug too.',
				createdAt: minutesAgo(60 * 25)
			}
		],
		plans: []
	},
	{
		id: 'sample-post-pasta',
		authorId: brenton.id,
		body: 'Made extra pasta. There’s a container for you in the fridge.',
		photoUrl: null,
		createdAt: minutesAgo(130),
		reactions: [{ profileId: chris.id, reaction: 'heart' }],
		replies: [
			{
				id: 'sample-reply-pasta',
				authorId: chris.id,
				body: 'Perfect, I’ll grab it after training.',
				createdAt: minutesAgo(118)
			}
		],
		plans: []
	},
	{
		id: 'sample-post-dumplings',
		authorId: brenton.id,
		body: 'Anyone keen for dumplings Friday?',
		photoUrl: null,
		createdAt: minutesAgo(25),
		reactions: [{ profileId: chris.id, reaction: 'thumbs_up' }],
		replies: [],
		plans: []
	},
	{
		id: 'sample-post-plumber',
		authorId: chris.id,
		body: 'Plumber’s booked for Thursday morning. I’ll work from home.',
		photoUrl: null,
		createdAt: minutesAgo(60 * 24 * 3),
		reactions: [],
		replies: [],
		plans: []
	},
	{
		id: 'sample-post-plant',
		authorId: brenton.id,
		body: 'The fiddle leaf has a new leaf. We’re basically farmers now.',
		photoUrl: null,
		createdAt: minutesAgo(60 * 24 * 4),
		reactions: [],
		replies: [],
		plans: []
	},
	{
		id: 'sample-post-wifi',
		authorId: chris.id,
		body: 'Wi-Fi was down for an hour. Restarted the router, all good.',
		photoUrl: null,
		createdAt: minutesAgo(60 * 24 * 5),
		reactions: [],
		replies: [],
		plans: []
	},
	{
		id: 'sample-post-bins',
		authorId: brenton.id,
		body: 'Council collects the green bin on Monday this week (public holiday).',
		photoUrl: null,
		createdAt: minutesAgo(60 * 24 * 7),
		reactions: [],
		replies: [],
		plans: []
	},
	{
		id: 'sample-post-movie',
		authorId: chris.id,
		body: 'Movie night Saturday? I’ll do popcorn.',
		photoUrl: null,
		createdAt: minutesAgo(60 * 24 * 9),
		reactions: [],
		replies: [],
		plans: []
	}
];
