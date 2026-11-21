import { describe, expect, it } from 'vitest';
import { contactsFrom, otherNotes, wifiFrom, wifiQrText } from './house-info.js';

const note = (title: string, body: string, isSecret = false) => ({
	id: title,
	title,
	body,
	isSecret,
	updatedAt: ''
});

describe('Wi-Fi from notes', () => {
	const notes = [note('Wifi', 'Network: homebase\nPassword: correct;horse', true)];

	it('reads the network and password', () => {
		expect(wifiFrom(notes)).toEqual({
			noteId: 'Wifi',
			network: 'homebase',
			password: 'correct;horse',
			isSecret: true
		});
	});

	it('escapes the QR text the way phones expect', () => {
		expect(wifiQrText(wifiFrom(notes)!)).toBe(String.raw`WIFI:T:WPA;S:homebase;P:correct\;horse;;`);
		expect(wifiQrText({ network: 'Open', password: '' })).toBe('WIFI:T:nopass;S:Open;;');
	});
});

describe('contacts from notes', () => {
	const notes = [
		note('Plumber', 'Dave · 0412 345 678'),
		note('Agent', 'Priya (Ray White) ph (02) 9555 0134\nAfter hours: +61 2 9555 0199'),
		note('Poison info', '13 11 26'),
		note('Bins', 'Red bin every Tuesday night.'),
		note('Safe', 'Code 0412 345 678', true)
	];

	it('finds Australian numbers as people write them', () => {
		const contacts = contactsFrom(notes);
		expect(contacts.map((c) => [c.name, c.dial])).toEqual([
			['Plumber', '0412345678'],
			['Agent', '0295550134'],
			['Agent', '+61295550199'],
			['Poison info', '131126']
		]);
		expect(contacts[1].detail).toBe('Priya (Ray White)');
	});

	it('keeps secret notes out of contacts', () => {
		expect(contactsFrom(notes).some((c) => c.name === 'Safe')).toBe(false);
	});

	it('hides notes whose every line is a number, and keeps the rest', () => {
		const withMore = [...notes, note('Vet', 'Northside Vet (02) 9555 1234\nOpen till 7')];
		const shown = otherNotes(withMore, null, contactsFrom(withMore)).map((n) => n.title);
		expect(shown).toEqual(['Bins', 'Safe', 'Vet']);
	});
});
