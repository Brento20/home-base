import { describe, expect, it } from 'vitest';
import { planMotif } from './motif.js';

describe('planMotif', () => {
	it('draws from the title, then the notes', () => {
		expect(planMotif({ title: 'Big aunty 70th' })).toBeTruthy();
		expect(planMotif({ title: 'Flight to Melbourne' })).toBeTruthy();
	});

	it('reads "settlement" as a house handover', () => {
		expect(planMotif({ title: 'Settlement day' })).toBe('house');
	});

	it('draws nothing when nothing matches', () => {
		expect(planMotif({ title: 'Quarterly review' })).toBeNull();
	});
});
