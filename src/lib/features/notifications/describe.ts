import { LOCALE } from '#lib/home.js';

/**
 * How a notification reads, the same in the notification centre on Home and on the phone's
 * lock screen. The database keeps the facts (20261201000000_notifications.sql); this words
 * them. The time zone and currency are passed in rather than read from the home, because a
 * push is worded after the request for whoever it's going to, wherever they are.
 */

export type NotificationKind =
	| 'friend_request'
	| 'friend_accepted'
	| 'postcard'
	| 'postcard_reply'
	| 'postcard_reaction'
	| 'feed_post'
	| 'feed_reply'
	| 'feed_reaction'
	| 'plan_invite'
	| 'plan_response'
	| 'expense'
	| 'settlement'
	| 'task_assigned';

/** The settings a phone chooses between (push_subscriptions.groups). */
export type NotificationGroup = 'friends' | 'postcards' | 'posts' | 'plans' | 'money' | 'jobs';

export const NOTIFICATION_GROUPS: { value: NotificationGroup; label: string; detail: string }[] = [
	{ value: 'friends', label: 'Friends', detail: 'Requests, and when someone says yes' },
	{ value: 'postcards', label: 'Postcards', detail: 'New ones, replies and reacts' },
	{ value: 'posts', label: 'Posts', detail: 'From your home, with replies and reacts' },
	{ value: 'plans', label: 'Plans', detail: 'Invites, and who’s coming' },
	{ value: 'money', label: 'Money', detail: 'Expenses added and repayments' },
	{ value: 'jobs', label: 'Jobs', detail: 'When someone hands you one' }
];

export function groupOf(kind: NotificationKind): NotificationGroup {
	if (kind.startsWith('friend_')) return 'friends';
	if (kind.startsWith('postcard')) return 'postcards';
	if (kind.startsWith('feed_')) return 'posts';
	if (kind.startsWith('plan_')) return 'plans';
	if (kind === 'expense' || kind === 'settlement') return 'money';
	return 'jobs';
}

export interface NotificationFacts {
	kind: NotificationKind;
	actorName: string;
	subject: string;
	detail: string;
	place: string;
	amountCents: number | null;
	currency: string | null;
	startsAt: string | null;
}

export interface Wording {
	title: string;
	body: string;
}

const REACTED: Record<string, string> = {
	heart: 'loved',
	thumbs_up: 'liked',
	laugh: 'laughed at',
	thanks: 'said thanks for'
};

const reacted = (reaction: string) => REACTED[reaction] ?? 'reacted to';

function money(cents: number | null, currency: string | null) {
	if (cents === null) return '';
	return new Intl.NumberFormat(LOCALE, {
		style: 'currency',
		currency: currency ?? 'AUD',
		currencyDisplay: 'narrowSymbol'
	}).format(cents / 100);
}

/** "Sunday 7 Dec, 1:00 pm", or just the day for something without a time. */
function when(startsAt: string | null, timeZone: string, withTime: boolean) {
	if (!startsAt) return '';
	const instant = new Date(startsAt);
	const day = new Intl.DateTimeFormat(LOCALE, {
		timeZone,
		weekday: 'long',
		day: 'numeric',
		month: 'short'
	}).format(instant);
	if (!withTime) return day;
	const time = new Intl.DateTimeFormat(LOCALE, {
		timeZone,
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	})
		.format(instant)
		.replace(/\s?(am|pm)$/i, (suffix) => ` ${suffix.trim().toLowerCase()}`);
	return `${day}, ${time}`;
}

/** A job's due day: stored as a date, so read in UTC to keep it the same day everywhere. */
const dueDay = (startsAt: string | null) => when(startsAt, 'UTC', false);

export function describeNotification(facts: NotificationFacts, timeZone: string): Wording {
	const who = facts.actorName || 'Someone';
	const said = facts.subject;
	switch (facts.kind) {
		case 'friend_request':
			return { title: `${who} wants to be friends`, body: 'Say yes or no.' };
		case 'friend_accepted':
			return { title: `You and ${who} are friends now`, body: 'Send them a postcard.' };
		case 'postcard':
			return { title: `Postcard from ${who}`, body: said };
		case 'postcard_reply':
			return {
				title: facts.detail === 'yours' ? `${who} replied to your postcard` : `${who} wrote back`,
				body: said
			};
		case 'postcard_reaction':
			return { title: `${who} ${reacted(facts.detail)} your postcard`, body: said };
		case 'feed_post':
			return { title: `${who} posted`, body: said || 'A photo.' };
		case 'feed_reply':
			return {
				title: facts.detail === 'thread' ? `${who} also replied` : `${who} replied to your post`,
				body: said
			};
		case 'feed_reaction':
			return { title: `${who} ${reacted(facts.detail)} your post`, body: said || 'Your photo.' };
		case 'plan_invite':
			return {
				title: `${who} invited you to ${said}`,
				body: [facts.place, when(facts.startsAt, timeZone, true)].filter(Boolean).join(' · ')
			};
		case 'plan_response':
			return {
				title:
					facts.detail === 'going' ? `${who}’s coming to ${said}` : `${who} can’t make ${said}`,
				body: when(facts.startsAt, timeZone, true)
			};
		case 'expense':
			return {
				title: `${who} added ${said}`,
				body: [money(facts.amountCents, facts.currency), facts.place && `in ${facts.place}`]
					.filter(Boolean)
					.join(' ')
			};
		case 'settlement':
			return facts.detail === 'to_you'
				? {
						title: `${who} paid you ${money(facts.amountCents, facts.currency)}`,
						body: facts.place ? `In ${facts.place}` : ''
					}
				: {
						title: `${who} marked your ${money(facts.amountCents, facts.currency)} as paid`,
						body: facts.place ? `In ${facts.place}` : ''
					};
		case 'task_assigned': {
			const due = dueDay(facts.startsAt);
			return { title: `${who} gave you a job`, body: due ? `${said}, due ${due}` : said };
		}
	}
}

/** A notification as the app shows it. */
export interface AppNotification extends NotificationFacts {
	id: string;
	actorId: string | null;
	actorInitials: string;
	actorColour: string;
	/** Where tapping it goes. */
	url: string;
	createdAt: string;
	read: boolean;
}

/** One phone's notification settings (push_subscriptions). */
export interface PhoneSettings {
	groups: NotificationGroup[];
	/** Quiet hours, 0 to 23, or null for none. */
	quietFrom: number | null;
	quietTo: number | null;
}

export const ALL_GROUPS: NotificationGroup[] = NOTIFICATION_GROUPS.map((group) => group.value);

/**
 * Push services this app sends to: Apple's, Google's (Chrome, Android), Mozilla's and
 * Microsoft's. The server posts to a phone's endpoint, so anything else is refused rather than
 * fetched.
 */
const PUSH_HOSTS = [
	'push.apple.com',
	'fcm.googleapis.com',
	'push.services.mozilla.com',
	'notify.windows.com'
];

export function isPushEndpoint(value: string): boolean {
	try {
		const url = new URL(value);
		return (
			url.protocol === 'https:' &&
			PUSH_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
		);
	} catch {
		return false;
	}
}
