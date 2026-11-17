import { addDays, todayISO, zonedToInstant } from '#lib/time.js';
import type {
	AccountDetails,
	Expense,
	ExpenseGroup,
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
	avatarUrl: null
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
		completedAt: null,
		items: [item('Picture hooks', false, brenton.id), item('Sandpaper', false, brenton.id)]
	},
	{
		id: crypto.randomUUID(),
		name: 'Party supplies',
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
	createdBy: brenton.id
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
