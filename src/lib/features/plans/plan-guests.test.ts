import { describe, expect, it } from 'vitest';
import type { PlanGuest } from '#lib/types.js';
import { describeGuests, listNames, responseLabel } from './plan-guests.js';

const guest = (name: string, response: PlanGuest['response'], isYou = false): PlanGuest => ({
	id: name,
	name,
	initials: name[0],
	colour: '#fff',
	avatarUrl: null,
	home: 'Home',
	isHostHome: false,
	response,
	isYou,
	canAdd: false
});

describe('describeGuests', () => {
	it('says who is going, who has not replied and who is not going', () => {
		expect(
			describeGuests([
				guest('Sam', 'going'),
				guest('Brenton', 'going', true),
				guest('Chris', null),
				guest('Jo', 'not_going')
			])
		).toEqual(['Sam and you are going.', 'Chris hasn’t replied.', 'Jo isn’t going.']);
	});

	it('gets "you" on its own right', () => {
		expect(describeGuests([guest('Brenton', null, true), guest('Sam', 'going')])).toEqual([
			'Sam is going.',
			'You haven’t replied.'
		]);
		expect(describeGuests([guest('A', null), guest('B', null), guest('C', null)])).toEqual([
			'A, B and C haven’t replied.'
		]);
	});
});

describe('listNames and responseLabel', () => {
	it('joins names and labels answers', () => {
		expect(listNames([])).toBe('');
		expect(listNames(['Sam'])).toBe('Sam');
		expect(listNames(['Sam', 'Jo', 'Alex'])).toBe('Sam, Jo and Alex');
		expect(responseLabel('going')).toBe('You’re going');
		expect(responseLabel(null)).toBe('Reply');
	});
});
