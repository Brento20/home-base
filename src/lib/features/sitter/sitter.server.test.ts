import { describe, expect, it } from 'vitest';
import { parsePostcard } from '#lib/features/friends/postcards.server.js';
import { parseSitterForm } from './sitter.server.js';

const form = (entries: [string, string][]) => {
	const data = new FormData();
	for (const [key, value] of entries) data.append(key, value);
	return data;
};

describe('parseSitterForm', () => {
	const today = '2026-11-21';

	it('keeps the picked notes, the chores box and the last day', () => {
		const { values, problem } = parseSitterForm(
			form([
				['label', ' Sam '],
				['message', 'Feed the cat'],
				['notes', 'a'],
				['notes', 'b'],
				['chores', 'on'],
				['lastDay', '2026-11-28']
			]),
			today
		);
		expect(problem).toBeNull();
		expect(values).toEqual({
			label: 'Sam',
			message: 'Feed the cat',
			noteIds: ['a', 'b'],
			showChores: true,
			lastDay: '2026-11-28'
		});
	});

	it('refuses a last day in the past or more than 60 days away', () => {
		for (const lastDay of ['2026-11-20', '2027-01-21', 'soon'])
			expect(
				parseSitterForm(
					form([
						['message', 'hi'],
						['lastDay', lastDay]
					]),
					today
				).problem
			).toMatch(/last day/);
		expect(
			parseSitterForm(
				form([
					['message', 'hi'],
					['lastDay', today]
				]),
				today
			).problem
		).toBeNull();
	});

	it('wants something to show', () => {
		expect(parseSitterForm(form([['lastDay', '2026-11-22']]), today).problem).toMatch(
			/something to see/
		);
	});
});

describe('parsePostcard', () => {
	it('takes a photo, a few lines or both, for a friend', () => {
		const words = parsePostcard(
			form([
				['to', 'x'],
				['body', ' Hi! ']
			])
		);
		expect(words).toMatchObject({ to: 'x', body: 'Hi!', photo: null, valid: true });

		const data = form([['to', 'x']]);
		data.append('photo', new File(['jpg'], 'figs.jpg', { type: 'image/jpeg' }));
		expect(parsePostcard(data)).toMatchObject({ body: '', valid: true });
	});

	it('refuses an empty card, a long one, an odd photo, or no friend', () => {
		expect(
			parsePostcard(
				form([
					['to', 'x'],
					['body', '  ']
				])
			).errors.body
		).toMatch(/Write/);
		expect(
			parsePostcard(
				form([
					['to', 'x'],
					['body', 'a'.repeat(501)]
				])
			).errors.body
		).toMatch(/500/);
		const gif = form([['to', 'x']]);
		gif.append('photo', new File(['gif'], 'a.gif', { type: 'image/gif' }));
		expect(parsePostcard(gif).errors.photo).toMatch(/type/);
		expect(parsePostcard(form([['body', 'Hi']])).message).toMatch(/who/);
	});
});
