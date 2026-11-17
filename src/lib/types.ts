/**
 * Shapes shared by the server and the pages. Each feature's *.server.ts turns database rows
 * (snake_case) into these (camelCase).
 */

export interface Profile {
	id: string;
	displayName: string;
	initials: string;
	accentColour: string;
	/** A same-site URL for their photo, or null to show initials. */
	avatarUrl: string | null;
}

/** The signed-in person's own details, as the profile form edits them. */

export interface AccountDetails {
	email: string;
	firstName: string;
	lastName: string;
	nickname: string;
	pronouns: string;
	/** 'YYYY-MM-DD', or empty. */
	dateOfBirth: string;
	avatarUrl: string | null;
}

export type ProfileField =
	'firstName' | 'lastName' | 'nickname' | 'pronouns' | 'dateOfBirth' | 'photo';

export type ProfileValues = Pick<
	AccountDetails,
	'firstName' | 'lastName' | 'nickname' | 'pronouns' | 'dateOfBirth'
>;

/** Something everyone in the home might need: the wifi, bin nights, the spare key. */
export interface HomeNote {
	id: string;
	title: string;
	body: string;
	/** Hidden behind dots until tapped. Still readable by everyone in the home. */
	isSecret: boolean;
	updatedAt: string;
}

export interface Household {
	id: string;
	name: string;
	members: Profile[];
	/** Members who can rename the home and set its password. */
	ownerIds: string[];
}

export interface ListItem {
	id: string;
	name: string;
	checked: boolean;
	createdBy: string | null;
}

/** A named shopping or checklist list. */
export interface ShoppingList {
	id: string;
	name: string;
	/** Set once every item is ticked; the list then lives in Past lists. */
	completedAt: string | null;
	items: ListItem[];
}

export interface ListSummary {
	id: string;
	name: string;
	total: number;
	remaining: number;
	completedAt: string | null;
}

export interface Task {
	id: string;
	title: string;
	notes: string;
	/** Null means anyone in the home. */
	assigneeId: string | null;
	/** Household-local calendar date, 'YYYY-MM-DD'. */
	dueOn: string | null;
	completedAt: string | null;
	completedBy: string | null;
	repeat: import('#lib/features/tasks/repeat.js').Repeat;
	createdBy: string | null;
}

export interface Plan {
	id: string;
	title: string;
	notes: string;
	location: string;
	/** ISO instant. */
	startsAt: string;
	endsAt: string | null;
	allDay: boolean;
}

/** Field-level messages for a form that failed validation. */
export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** Points for one person: one per task they ticked off. */
export interface Score {
	profileId: string;
	thisWeek: number;
	allTime: number;
}

/** A shared-expenses group inside a home, like "Our Place" or "Car". */
export interface ExpenseGroup {
	id: string;
	name: string;
	memberIds: string[];
}

/** A group on the Money tab, with where the signed-in person stands in it. */
export interface ExpenseGroupSummary extends ExpenseGroup {
	/** Positive: you're owed. Negative: you owe. */
	myNetCents: number;
}

export interface ExpenseShare {
	profileId: string;
	owedCents: number;
	/** What was typed for this person (cents or a percentage); null for equal splits. */
	input: number | null;
}

export interface Expense {
	id: string;
	groupId: string;
	description: string;
	amountCents: number;
	paidBy: string;
	/** 'YYYY-MM-DD' */
	spentOn: string;
	category: import('#lib/features/expenses/categories.js').CategoryKey;
	splitMethod: import('#lib/features/expenses/split.js').SplitMethod;
	shares: ExpenseShare[];
	createdAt: string;
}

/** A repayment recorded with Settle up. */
export interface Settlement {
	id: string;
	groupId: string;
	paidBy: string;
	paidTo: string;
	amountCents: number;
	/** 'YYYY-MM-DD' */
	paidOn: string;
	createdAt: string;
}

/** One line in a group's history, newest first. */
export type ExpenseActivity =
	| { kind: 'expense'; date: string; expense: Expense }
	| { kind: 'settlement'; date: string; settlement: Settlement };
