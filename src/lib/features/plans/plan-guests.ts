/**
 * Plans with guests: when a home invites a friend's home to a plan, everyone in both answers for
 * themselves (20261125000300_plan_invites.sql). This is the wording shared by the browser and
 * the server.
 */
import type { PlanGuest, PlanResponse } from '#lib/types.js';

/** "Sam", "Sam and Jo", "Sam, Jo and Alex". */
export function listNames(names: string[]) {
	if (names.length <= 1) return names[0] ?? '';
	return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

const nameFor = (guest: PlanGuest) => (guest.isYou ? 'You' : guest.name);

/**
 * Who's going, who hasn't replied and who isn't, as sentences:
 * "Sam and you are going. Chris hasn't replied. Jo isn't going."
 */
export function describeGuests(guests: PlanGuest[]): string[] {
	// "You" reads best last in a list: "Sam and you".
	const ordered = [...guests].sort((a, b) => Number(a.isYou) - Number(b.isYou));
	const named = (response: PlanResponse | null) =>
		ordered
			.filter((guest) => guest.response === response)
			.map((guest, index, all) => (guest.isYou && all.length > 1 ? 'you' : nameFor(guest)));
	const going = named('going');
	const waiting = named(null);
	const notGoing = named('not_going');
	const plural = (names: string[]) => names.length > 1 || names[0] === 'You';

	const lines: string[] = [];
	if (going.length) lines.push(`${listNames(going)} ${plural(going) ? 'are' : 'is'} going.`);
	if (waiting.length)
		lines.push(`${listNames(waiting)} ${plural(waiting) ? 'haven’t' : 'hasn’t'} replied.`);
	if (notGoing.length)
		lines.push(`${listNames(notGoing)} ${plural(notGoing) ? 'aren’t' : 'isn’t'} going.`);
	return lines;
}

/** For a plan row: "Invite from Sam · You're going". */
export function responseLabel(response: PlanResponse | null | undefined) {
	if (response === 'going') return 'You’re going';
	if (response === 'not_going') return 'You’re not going';
	return 'Reply';
}
