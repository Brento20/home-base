import { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT } from '$app/env/private';
import { dbError } from '#lib/server/db.js';
import { sendPush, type VapidKeys } from '#lib/server/web-push.js';
import {
	ALL_GROUPS,
	describeNotification,
	isPushEndpoint,
	type AppNotification,
	type NotificationGroup,
	type NotificationKind,
	type PhoneSettings
} from './describe.js';

/**
 * Notifications: the centre at the top of Home, and the phone's own notifications.
 *
 * The database writes them as things happen (20261201000000_notifications.sql). Straight after
 * any action, the Worker sends the pushes that action set off (`deliverPushes`, from
 * hooks.server.ts), under the signed-in person's own session. Each phone that's turned them on
 * keeps its own choice of kinds and quiet hours.
 *
 * Sample mode keeps a few in memory, and phones' settings, but sends nothing.
 */

interface NotificationRow {
	id: string;
	kind: NotificationKind;
	actor_id: string | null;
	actor_name: string;
	actor_initials: string;
	actor_colour: string;
	subject: string;
	detail: string;
	place: string;
	amount_cents: number | null;
	currency: string | null;
	starts_at: string | null;
	url: string;
	created_at: string;
	read_at: string | null;
}

const COLUMNS =
	'id, kind, actor_id, actor_name, actor_initials, actor_colour, subject, detail, place, amount_cents, currency, starts_at, url, created_at, read_at';

const fromRow = (row: NotificationRow): AppNotification => ({
	id: row.id,
	kind: row.kind,
	actorId: row.actor_id,
	actorName: row.actor_name,
	actorInitials: row.actor_initials,
	actorColour: row.actor_colour,
	subject: row.subject,
	detail: row.detail,
	place: row.place,
	amountCents: row.amount_cents,
	currency: row.currency,
	startsAt: row.starts_at,
	url: row.url,
	createdAt: new Date(row.created_at).toISOString(),
	read: row.read_at !== null
});

/** Yours, newest first. */
export async function listNotifications(
	locals: App.Locals,
	limit = 30
): Promise<AppNotification[]> {
	if (!locals.supabase)
		return [...sampleList()]
			.sort((one, two) => two.createdAt.localeCompare(one.createdAt))
			.slice(0, limit)
			.map((item) => ({ ...item }));
	const { data, error } = await locals.supabase
		.from('notifications')
		.select(COLUMNS)
		.order('created_at', { ascending: false })
		.limit(limit);
	// Deployed before the database was updated: an empty centre, not a broken Home.
	if (error?.code === '42P01' || error?.code === 'PGRST205') return [];
	if (error) dbError(error);
	return ((data ?? []) as NotificationRow[]).map(fromRow);
}

/** How many you haven't seen: the dot on the Home tab and the app icon's badge. */
export async function countUnread(locals: App.Locals): Promise<number> {
	if (!locals.supabase) return sampleList().filter((item) => !item.read).length;
	if (!locals.user) return 0;
	const { count, error } = await locals.supabase
		.from('notifications')
		.select('id', { count: 'exact', head: true })
		.is('read_at', null);
	if (error) return 0; // only a dot: never worth failing a page over
	return count ?? 0;
}

/** Marks these read, or all of them. */
export async function markRead(locals: App.Locals, ids?: string[]) {
	if (!locals.supabase) {
		for (const item of sampleList()) if (!ids || ids.includes(item.id)) item.read = true;
		return;
	}
	const { error } = await locals.supabase.rpc('mark_notifications_read', {
		which: ids?.length ? ids : null
	});
	if (error) dbError(error);
}

/** Opening one: marks it read and says where it goes. Null if it's gone (or not yours). */
export async function openNotification(locals: App.Locals, id: string): Promise<string | null> {
	if (!/^[0-9a-z-]{1,40}$/.test(id)) return null;
	if (!locals.supabase) {
		const found = sampleList().find((item) => item.id === id);
		if (!found) return null;
		found.read = true;
		return found.url;
	}
	const { data } = await locals.supabase
		.from('notifications')
		.select('url')
		.eq('id', id)
		.maybeSingle();
	if (!data) return null;
	await markRead(locals, [id]);
	return (data as { url: string }).url;
}

// Phones -----------------------------------------------------------------------------------

/** The app's push keys, or null when they aren't set (phones then aren't offered pushes). */
export function vapidKeys(): VapidKeys | null {
	if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null;
	return {
		publicKey: VAPID_PUBLIC_KEY,
		privateKey: VAPID_PRIVATE_KEY,
		subject: VAPID_SUBJECT || 'mailto:brenton.weaver@gmail.com'
	};
}

/** The public key phones subscribe with, for the page; null if pushes aren't set up. */
export const pushPublicKey = (): string | null => vapidKeys()?.publicKey ?? null;

export interface PhoneSubscription {
	endpoint: string;
	p256dh: string;
	auth: string;
}

interface PhoneRow {
	groups: string[];
	quiet_from: number | null;
	quiet_to: number | null;
}

const phoneFromRow = (row: PhoneRow): PhoneSettings => ({
	groups: row.groups.filter((group): group is NotificationGroup =>
		ALL_GROUPS.includes(group as NotificationGroup)
	),
	quietFrom: row.quiet_from,
	quietTo: row.quiet_to
});

/** This phone's settings, if it's turned notifications on (and they're yours). */
export async function getPhone(
	locals: App.Locals,
	endpoint: string
): Promise<PhoneSettings | null> {
	if (!isPushEndpoint(endpoint)) return null;
	if (!locals.supabase) return samplePhones.get(endpoint) ?? null;
	const { data } = await locals.supabase
		.from('push_subscriptions')
		.select('groups, quiet_from, quiet_to')
		.eq('endpoint', endpoint)
		.maybeSingle();
	return data ? phoneFromRow(data as PhoneRow) : null;
}

/** Turns notifications on for this phone, with everything on and no quiet hours. */
export async function savePhone(
	locals: App.Locals,
	subscription: PhoneSubscription,
	timeZone: string
): Promise<PhoneSettings> {
	if (!isPushEndpoint(subscription.endpoint)) throw new Error('That isn’t a push address.');
	const fresh: PhoneSettings = { groups: [...ALL_GROUPS], quietFrom: null, quietTo: null };
	if (!locals.supabase) {
		const existing = samplePhones.get(subscription.endpoint);
		samplePhones.set(subscription.endpoint, existing ?? fresh);
		return existing ?? fresh;
	}
	const { error } = await locals.supabase.rpc('save_push_subscription', {
		endpoint: subscription.endpoint,
		p256dh: subscription.p256dh,
		auth: subscription.auth,
		time_zone: timeZone
	});
	if (error) dbError(error);
	return (await getPhone(locals, subscription.endpoint)) ?? fresh;
}

/** Changes which kinds this phone gets, and its quiet hours. */
export async function updatePhone(
	locals: App.Locals,
	endpoint: string,
	settings: PhoneSettings
): Promise<PhoneSettings | null> {
	if (!isPushEndpoint(endpoint)) return null;
	const groups = ALL_GROUPS.filter((group) => settings.groups.includes(group));
	const quiet =
		settings.quietFrom !== null &&
		settings.quietTo !== null &&
		settings.quietFrom !== settings.quietTo;
	const tidy: PhoneSettings = {
		groups,
		quietFrom: quiet ? settings.quietFrom : null,
		quietTo: quiet ? settings.quietTo : null
	};
	if (!locals.supabase) {
		if (!samplePhones.has(endpoint)) return null;
		samplePhones.set(endpoint, tidy);
		return tidy;
	}
	const { data, error } = await locals.supabase
		.from('push_subscriptions')
		.update({
			groups: tidy.groups,
			quiet_from: tidy.quietFrom,
			quiet_to: tidy.quietTo,
			updated_at: new Date().toISOString()
		})
		.eq('endpoint', endpoint)
		.select('groups, quiet_from, quiet_to')
		.maybeSingle();
	if (error) dbError(error);
	return data ? phoneFromRow(data as PhoneRow) : null;
}

/** Turns notifications off for this phone. */
export async function removePhone(locals: App.Locals, endpoint: string) {
	if (!isPushEndpoint(endpoint)) return;
	if (!locals.supabase) {
		samplePhones.delete(endpoint);
		return;
	}
	const { error } = await locals.supabase
		.from('push_subscriptions')
		.delete()
		.eq('endpoint', endpoint);
	if (error) dbError(error);
}

// Sending ----------------------------------------------------------------------------------

interface PushRow {
	notification_id: string;
	kind: NotificationKind;
	actor_name: string;
	subject: string;
	detail: string;
	place: string;
	amount_cents: number | null;
	currency: string | null;
	starts_at: string | null;
	unread: number;
	endpoint: string;
	p256dh: string;
	auth: string;
	time_zone: string;
}

/** What a phone is sent: the words, where tapping goes, and the app icon's new count. */
export function pushPayload(row: PushRow) {
	const { title, body } = describeNotification(
		{
			kind: row.kind,
			actorName: row.actor_name,
			subject: row.subject,
			detail: row.detail,
			place: row.place,
			amountCents: row.amount_cents,
			currency: row.currency,
			startsAt: row.starts_at
		},
		row.time_zone
	);
	return {
		title,
		body,
		url: `/notifications/${row.notification_id}`,
		tag: row.notification_id,
		badge: row.unread
	};
}

/**
 * Sends whatever the signed-in person's last action set off: claims them (so each goes out
 * once), seals one for each phone that wants it, and forgets phones the push service says are
 * gone. Runs after the response (hooks.server.ts); nothing waits on it.
 */
export async function deliverPushes(locals: App.Locals, send: typeof fetch = fetch) {
	const keys = vapidKeys();
	if (!keys || !locals.supabase || !locals.user) return;
	const { data, error } = await locals.supabase.rpc('claim_my_pushes');
	if (error) throw new Error(error.message);
	const rows = (data ?? []) as PushRow[];
	await Promise.all(
		rows
			.filter((row) => isPushEndpoint(row.endpoint))
			.map(async (row) => {
				const status = await sendPush(
					{ endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
					pushPayload(row),
					keys,
					{},
					send
				);
				if (status === 404 || status === 410) {
					await locals.supabase?.rpc('drop_push_subscription', { endpoint: row.endpoint });
				}
			})
	);
}

// Sample mode ------------------------------------------------------------------------------

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
/** Days from now at an hour of the day in UTC (2 is 1 pm in Sydney in summer). */
const inDays = (days: number, utcHour: number) => {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() + days);
	date.setUTCHours(utcHour, 0, 0, 0);
	return date.toISOString();
};

const sample = (
	id: string,
	kind: NotificationKind,
	actor: [string, string, string, string],
	extra: Partial<AppNotification> & { minutes: number }
): AppNotification => ({
	id,
	kind,
	actorId: actor[0],
	actorName: actor[1],
	actorInitials: actor[2],
	actorColour: actor[3],
	subject: '',
	detail: '',
	place: '',
	amountCents: null,
	currency: null,
	startsAt: null,
	url: '/',
	read: false,
	...extra,
	createdAt: minutesAgo(extra.minutes)
});

const JO: [string, string, string, string] = ['sample-jo', 'Jo', 'J', '#e3b75c'];
const CHRIS: [string, string, string, string] = ['sample-chris', 'Chris', 'C', '#d6dce2'];
const SAM: [string, string, string, string] = ['sample-sam', 'Sam', 'S', '#8fb7a5'];

// Made on first use, not when the module loads: a Worker's clock reads 1970 until a request
// arrives, so times worked out at load would all be wrong.
let sampleStore: AppNotification[] | null = null;
const sampleList = () => (sampleStore ??= makeSamples());

const makeSamples = (): AppNotification[] => [
	sample('sample-n-request', 'friend_request', JO, { minutes: 120, url: '/profile' }),
	sample('sample-n-react', 'feed_reaction', CHRIS, {
		minutes: 14,
		subject: 'Found the perfect lamp for the reading corner',
		detail: 'heart',
		url: '/feed/sample-post-lamp'
	}),
	sample('sample-n-plan', 'plan_response', SAM, {
		minutes: 50,
		subject: 'Long lunch at The Terrace',
		detail: 'going',
		startsAt: inDays(2, 2),
		url: '/plans/sample-plan-invite'
	}),
	sample('sample-n-expense', 'expense', CHRIS, {
		minutes: 180,
		subject: 'Groceries',
		amountCents: 12000,
		currency: 'AUD',
		place: 'Our Place',
		url: '/money/sample-group-place'
	}),
	sample('sample-n-postcard', 'postcard', SAM, {
		minutes: 60 * 26,
		subject: 'Greetings from The Terrace! The figs are finally ripe. Come grab a bag this weekend.',
		url: '/postcards/sample-postcard-1',
		read: true
	}),
	sample('sample-n-job', 'task_assigned', CHRIS, {
		minutes: 60 * 30,
		subject: 'Book the car service',
		startsAt: inDays(3, 0).slice(0, 10) + 'T00:00:00.000Z',
		url: '/lists/tasks',
		read: true
	})
];

const samplePhones = new Map<string, PhoneSettings>();

/**
 * A friend request you've answered: its notification goes. The database does this itself
 * (the friend_requests trigger); sample mode has to be told.
 */
export function forgetFriendRequest(locals: App.Locals, personId: string) {
	if (locals.supabase) return;
	const index = sampleList().findIndex(
		(item) => item.kind === 'friend_request' && item.actorId === personId
	);
	if (index >= 0) sampleList().splice(index, 1);
}

/**
 * A test notification to this phone only, to check the whole path works (keys, the push
 * service, the phone). 'sent', or why not.
 */
export async function testPhone(
	locals: App.Locals,
	endpoint: string,
	send: typeof fetch = fetch
): Promise<'sent' | 'not-set-up' | 'not-on' | 'gone' | 'failed'> {
	const keys = vapidKeys();
	if (!keys || !locals.supabase) return 'not-set-up';
	if (!isPushEndpoint(endpoint)) return 'not-on';
	const { data } = await locals.supabase
		.from('push_subscriptions')
		.select('endpoint, p256dh, auth')
		.eq('endpoint', endpoint)
		.maybeSingle();
	if (!data) return 'not-on';
	const target = data as { endpoint: string; p256dh: string; auth: string };
	const status = await sendPush(
		target,
		{
			title: 'Notifications are on',
			body: 'This is how they’ll look on this phone.',
			url: '/notifications',
			tag: 'test'
		},
		keys,
		{ urgency: 'high', ttl: 60 },
		send
	);
	if (status === 404 || status === 410) {
		await removePhone(locals, endpoint);
		return 'gone';
	}
	return status >= 200 && status < 300 ? 'sent' : 'failed';
}
