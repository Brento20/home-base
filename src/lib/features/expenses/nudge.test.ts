import { describe, expect, it } from 'vitest';
import type { ExpenseGroupSummary } from '#lib/types.js';
import { aboutAmount, settleNudge } from './nudge.js';

const group = (id: string, myNetCents: number, to = 'chris'): ExpenseGroupSummary =>
	({
		id,
		name: id,
		memberIds: ['me', to],
		myNetCents,
		myDebts: myNetCents < 0 ? [{ from: 'me', to, cents: -myNetCents }] : []
	}) as ExpenseGroupSummary;

describe('the settle-up nudge', () => {
	it('stays quiet when off, or under the amount you chose', () => {
		expect(settleNudge([group('home', -50000)], 'me', 0)).toBeNull();
		expect(settleNudge([group('home', -9000)], 'me', 100)).toBeNull();
		expect(settleNudge([group('home', 20000)], 'me', 50)).toBeNull();
	});

	it('names the group you’re furthest behind in, and who you’d pay', () => {
		expect(settleNudge([group('car', -12000), group('home', -31000)], 'me', 100)).toEqual({
			groupId: 'home',
			groupName: 'home',
			cents: 31000,
			to: 'chris'
		});
	});

	it('rounds to an "about" amount', () => {
		expect(aboutAmount(12340)).toBe('$120');
		expect(aboutAmount(5730)).toBe('$55');
		expect(aboutAmount(120)).toBe('$5');
		expect(aboutAmount(158000)).toBe('$1,580');
	});
});
