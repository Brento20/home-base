/**
 * The handy bits of a home, read out of its notes so there's nothing new to set up: a note called
 * "Wi-Fi" becomes a card you can share as a QR code, and any note with a phone number in it
 * becomes a contact you can call or text in one tap. The notes stay the one place it's edited.
 */
import type { HomeNote } from '#lib/types.js';

export interface WifiDetails {
	noteId: string;
	network: string;
	password: string;
	/** The note's own secret flag: the password stays dotted until asked for. */
	isSecret: boolean;
}

export interface Contact {
	/** Note id plus position, so a note with two numbers gives two rows. */
	key: string;
	noteId: string;
	name: string;
	/** What else the line says, e.g. "Dave" for "Plumber" (empty when it's just the number). */
	detail: string;
	/** As written, for showing. */
	display: string;
	/** Digits (and a leading +) for tel: and sms: links. */
	dial: string;
}

const WIFI_TITLE = /^\s*(wi-?fi|wireless|internet)\b/i;

/** Lines like "Network: homebase" or "Password - abc". */
function field(body: string, names: string[]) {
	for (const line of body.split('\n')) {
		const match = line.match(/^\s*([a-z ]+?)\s*[:=-]\s*(.+?)\s*$/i);
		if (match && names.includes(match[1].toLowerCase())) return match[2];
	}
	return '';
}

export function wifiFrom(notes: HomeNote[]): WifiDetails | null {
	const note = notes.find((entry) => WIFI_TITLE.test(entry.title));
	if (!note) return null;
	const network = field(note.body, ['network', 'name', 'ssid', 'wifi', 'wi-fi']);
	const password = field(note.body, ['password', 'pass', 'key', 'passcode', 'pw']);
	if (!network) return null;
	return { noteId: note.id, network, password, isSecret: note.isSecret };
}

/**
 * The string phones read from a Wi-Fi QR code: WIFI:T:WPA;S:<name>;P:<password>;;
 * with \ ; , : and " escaped. An open network (no password) is T:nopass.
 */
export function wifiQrText({ network, password }: Pick<WifiDetails, 'network' | 'password'>) {
	const escape = (value: string) => value.replace(/([\\;,:"])/g, '\\$1');
	return password
		? `WIFI:T:WPA;S:${escape(network)};P:${escape(password)};;`
		: `WIFI:T:nopass;S:${escape(network)};;`;
}

// Australian numbers as people write them (0412 345 678, (02) 9555 0134, +61 412…, 1300 123 456,
// 13 22 65) and anything else international that starts with +. Eight digits at least.
const PHONE =
	/(?:\+\d[\d ()-]{7,16}\d|\(?0\d\)?[\d -]{7,12}\d|1[38]00[\d -]{5,8}\d|13[\d ]{4,6}\d)/g;

export function contactsFrom(notes: HomeNote[]): Contact[] {
	const contacts: Contact[] = [];
	for (const note of notes) {
		// A secret note's numbers aren't shown on the page, so they don't become contacts either.
		if (note.isSecret || WIFI_TITLE.test(note.title)) continue;
		let index = 0;
		for (const line of note.body.split('\n')) {
			for (const match of line.matchAll(PHONE)) {
				const dial = match[0].replace(/[^\d+]/g, '');
				if (dial.replace('+', '').length < 6) continue;
				const detail = line
					.replace(match[0], '')
					.replace(/^[\s:·–—-]+|[\s:·–—-]+$/g, '')
					.replace(/\b(ph|phone|mob|mobile|tel|call)\b[:.]?/gi, '')
					.trim();
				contacts.push({
					key: `${note.id}-${index++}`,
					noteId: note.id,
					name: note.title,
					detail,
					display: match[0].trim(),
					dial
				});
			}
		}
	}
	return contacts;
}

/**
 * Notes that aren't already shown in full elsewhere: the Wi-Fi note, and notes that are only
 * phone numbers. A note with more to say than its number stays, as well as being a contact.
 */
export function otherNotes(notes: HomeNote[], wifi: WifiDetails | null, contacts: Contact[]) {
	const contactNotes = new Set(contacts.map((contact) => contact.noteId));
	return notes.filter((note) => {
		if (note.id === wifi?.noteId) return false;
		if (!contactNotes.has(note.id)) return true;
		return note.body.split('\n').some((line) => line.trim() && !line.match(PHONE));
	});
}
