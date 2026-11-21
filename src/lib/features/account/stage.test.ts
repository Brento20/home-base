import { describe, expect, it } from 'vitest';
import { redirectFor, stageFor, type Stage } from './stage.js';

const stages: Stage[] = ['signed-out', 'profile', 'home', 'ready'];

describe('stages', () => {
	it('works out where someone is in signing up', () => {
		expect(stageFor(false, false, false)).toBe('signed-out');
		expect(stageFor(true, false, false)).toBe('profile');
		expect(stageFor(true, true, false)).toBe('home');
		expect(stageFor(true, true, true)).toBe('ready');
	});

	it('opens invite links and the privacy page in every stage', () => {
		for (const stage of stages) {
			expect(redirectFor(stage, '/join/[token]')).toBeNull();
			expect(redirectFor(stage, '/privacy')).toBeNull();
		}
	});

	it('keeps each group of pages for its stage', () => {
		expect(redirectFor('signed-out', '/(app)/today')).toBe('/welcome');
		expect(redirectFor('profile', '/(setup)/setup')).toBe('/setup/profile');
		expect(redirectFor('home', '/(app)/today')).toBe('/setup');
		expect(redirectFor('ready', '/(setup)/setup/join')).toBe('/');
		expect(redirectFor('ready', '/(public)/login')).toBe('/');
		expect(redirectFor('home', '/(setup)/setup/join')).toBeNull();
	});
});
