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
	/** Their colour (#e58440): avatar, rings, points. From AVATAR_COLOURS. */
	accentColour: string;
	/** A line about themselves that friends see. */
	bio: string;
}

export type ProfileField =
	| 'firstName'
	| 'lastName'
	| 'nickname'
	| 'pronouns'
	| 'dateOfBirth'
	| 'photo'
	| 'accentColour'
	| 'bio';

export type ProfileValues = Pick<
	AccountDetails,
	'firstName' | 'lastName' | 'nickname' | 'pronouns' | 'dateOfBirth'
> & {
	/** Missing when the form has no colour picker (signing up: a colour is given on joining). */
	accentColour?: string;
	/** Missing when the form has no bio field (signing up). */
	bio?: string;
};

/** Something everyone in the home might need: the wifi, bin nights, the spare key. */
export interface HomeNote {
	id: string;
	title: string;
	body: string;
	/** Hidden behind dots until tapped, and sealed in the database. Readable by everyone home. */
	isSecret: boolean;
	updatedAt: string;
	/** Sealed with a key this server doesn't have (NOTES_KEY missing or changed). */
	locked?: boolean;
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
	/** The home's always-there Shopping list (one per home): never finishes, can't be deleted. */
	pinned: boolean;
	/** Set once every item is ticked; the list then lives in Past lists. */
	completedAt: string | null;
	items: ListItem[];
}

export interface ListSummary {
	id: string;
	name: string;
	pinned: boolean;
	total: number;
	remaining: number;
	/** A few still-to-get names, newest first. */
	upNext: string[];
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
	/** 'HH:MM' household time, for dinners scheduled at a time. */
	dueTime: string | null;
	/**
	 * Set for dinners: the recipe it came from, and the dish's name. Lists and the calendar only
	 * need the name, so that's all they fetch; the cook view gets the whole recipe (CookDinner).
	 */
	recipeId: string | null;
	servings: number | null;
	recipe: { title: string } | null;
}

/** A dinner with the recipe as it was scheduled (ingredients, method), for the cook view. */
export type CookDinner = Omit<Task, 'recipe'> & {
	recipe: import('#lib/features/recipes/recipe.js').DinnerSnapshot;
};

export interface Plan {
	id: string;
	title: string;
	notes: string;
	location: string;
	/** ISO instant. */
	startsAt: string;
	endsAt: string | null;
	allDay: boolean;
	/** The feed post this plan was made from, if any. */
	postId?: string | null;
	/** Set when another home invited yours: who sent it and from which home. Only they can edit it. */
	invitedBy?: { name: string; home: string } | null;
	/** Homes this home has invited (on your own plans). */
	guestHomes?: { id: string; name: string }[];
	/** Your answer, on a plan with guests: going, not going, or none yet. */
	myResponse?: PlanResponse | null;
}

export type PlanResponse = 'going' | 'not_going';

/** Someone on a plan with guests: from the plan's home or an invited one. */
export interface PlanGuest {
	id: string;
	name: string;
	initials: string;
	colour: string;
	avatarUrl: string | null;
	home: string;
	isHostHome: boolean;
	response: PlanResponse | null;
	isYou: boolean;
	/** You both went, it's over, and you're not friends yet: one tap to be friends. */
	canAdd: boolean;
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
	/** Who you'd pay, or who'd pay you, to settle up (the simplified transfers that involve you). */
	myDebts: { from: string; to: string; cents: number }[];
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

/** The reactions a post can get, in the order they're offered. */
export type FeedReaction = 'heart' | 'thumbs_up' | 'laugh' | 'thanks';

export interface FeedReply {
	id: string;
	/** Null when the person has since left. */
	authorId: string | null;
	body: string;
	/** ISO instant. */
	createdAt: string;
	/**
	 * On postcard replies, who wrote it as the database recorded it: the sender and the home it
	 * went to can't look each other up.
	 */
	author?: { name: string; initials: string; colour: string };
}

/** A plan made from a post, shown on the post. */
export interface FeedPlanLink {
	id: string;
	title: string;
	/** ISO instant. */
	startsAt: string;
	allDay: boolean;
}

/** A post in the home feed: a message, a photo, or both. */
export interface FeedPost {
	id: string;
	authorId: string | null;
	body: string;
	/** Same-site URL for the photo, or null. */
	photoUrl: string | null;
	/** ISO instant. */
	createdAt: string;
	/** Who reacted with what; one reaction each. Postcard reactions carry the person's name. */
	reactions: { profileId: string; reaction: FeedReaction; name?: string }[];
	/** Oldest first. */
	replies: FeedReply[];
	plans: FeedPlanLink[]; /** Set when it's a postcard from a friend of someone here, not a post by the home. */
	postcard?: PostcardFrom;
}

/** Who sent a postcard, as it was when they sent it. */
export interface PostcardFrom {
	/** Null once they've deleted their account. */
	profileId: string | null;
	/** The friend it was addressed to (null for older postcards). */
	toProfileId: string | null;
	name: string;
	initials: string;
	colour: string;
	home: string;
}

/** A friend, as friends see each other: nothing of their home but its name. */
export interface Friend {
	id: string;
	name: string;
	initials: string;
	colour: string;
	avatarUrl: string | null;
	/** A line about themselves; empty if they haven't written one. */
	bio: string;
	/** Null when they're not in a home (so postcards can't reach them). */
	homeName: string | null;
	/** ISO instant. */
	friendsSince: string;
}

/** A friend link you've made that nobody has used yet. */
export interface FriendLink {
	id: string;
	createdAt: string;
	expiresAt: string;
}

/** Someone you've blocked. */
export interface Blocked {
	id: string;
	name: string;
}

/** A house-sitter link, as the home sees it (the token itself is only shown once). */
export interface SitterLink {
	id: string;
	label: string;
	message: string;
	noteCount: number;
	showChores: boolean;
	createdAt: string;
	expiresAt: string;
}

/** What anyone signed in can see of someone (src/lib/features/friends/public-profile.ts). */
export interface PublicProfile {
	id: string;
	name: string;
	initials: string;
	colour: string;
	/** Only for yourself, your home and your friends. */
	avatarUrl: string | null;
	pronouns: string;
	bio: string;
	homeName: string | null;
	fields: import('#lib/features/friends/public-profile.js').PublicFields;
	isYou: boolean;
	isFriend: boolean;
	sharesHome: boolean;
}
