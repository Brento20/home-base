import { describe, expect, it } from 'vitest';
import { GLYPHS } from './glyphs.js';
import { normalise, pickIcon, planIcon, read, stem, taskIcon } from './meaning.js';
import { MEANINGS } from './registry.js';

describe('pickIcon', () => {
	it('reads the game, not the first word: the platform follows the title', () => {
		expect(pickIcon('Play pokemon with chris')?.icon).toBe('pokeball');
		expect(pickIcon('Play Mario Cart')?.icon).toBe('switch-controller');
		expect(pickIcon('Play GTA 6')?.icon).toBe('gamepad');
		expect(pickIcon('Play tennis with Chris')?.icon).toBe('activity');
		expect(pickIcon('Play with the dog')?.icon).toBe('paw');
	});

	it('weighs the verb against the subject', () => {
		expect(pickIcon('Water the plants')?.icon).toBe('plant');
		expect(pickIcon('Drink water')?.icon).toBe('water');
		expect(pickIcon('Vacuum the lounge')?.icon).toBe('vacuum');
		expect(pickIcon('Buy a new couch')?.icon).toBe('sofa');
		expect(pickIcon('Cook dinner')?.icon).toBe('cooking-pot');
		expect(pickIcon('Dinner at Nobu')?.icon).toBe('utensils');
	});

	it('lets context lean but not decide, unless the subject is only a name', () => {
		expect(pickIcon('Dinner at the pub')?.icon).toBe('utensils');
		expect(pickIcon('Drinks at the pub')?.icon).toBe('wine');
		expect(pickIcon('Pick up Chris from the airport')?.icon).toBe('plane');
	});

	it('shows nothing when it isn’t sure', () => {
		expect(pickIcon('Something random')).toBeNull();
		expect(pickIcon('')).toBeNull();
	});

	it.each([
		['Play pokemon with chris', 'pokeball'],
		['Play Mario Cart', 'switch-controller'],
		['Play Mario Kart', 'switch-controller'],
		['Play GTA 6', 'gamepad'],
		['Play Pokémon on the Switch', 'pokeball'],
		['Take the bins out', 'bin'],
		['Bin night', 'bin'],
		['Vacuum the lounge', 'vacuum'],
		['Vacuum', 'vacuum'],
		['Buy milk', 'groceries'],
		['Call mum', 'call'],
		['Pay electricity bill', 'receipt'],
		['Walk the dog', 'paw'],
		['Play with the dog', 'paw'],
		['Water the plants', 'plant'],
		['Drink water', 'water'],
		['Book flights to Bali', 'plane'],
		['Chris’s birthday', 'gift'],
		['Big aunty 70th', 'gift'],
		['Christmas lunch', 'christmas-tree'],
		['Movie night', 'film'],
		['Watch Netflix', 'tv'],
		['Concert at the Enmore', 'music'],
		['Gym', 'dumbbell'],
		['Go for a run', 'activity'],
		['Play tennis with Chris', 'activity'],
		['Pay rent', 'dollar'],
		['Split the bill for dinner', 'split-expense'],
		['Do the laundry', 'laundry'],
		['Wash the dishes', 'dishes'],
		['Wash the car', 'car'],
		['Fix the light in the hall', 'lightbulb'],
		['Change the sheets', 'bed'],
		['Service the aircon', 'air-conditioning'],
		['Get keys cut', 'key'],
		['Reset the wifi', 'wifi'],
		['Bake a cake', 'cake'],
		['Coffee with Sam', 'coffee'],
		['Drinks at the pub', 'wine'],
		['Pizza night', 'pizza'],
		['Grocery shopping', 'groceries'],
		['Cook dinner', 'cooking-pot'],
		['Dinner at Nobu', 'utensils'],
		['Road trip to Byron', 'car'],
		['Pack for Bali', 'suitcase'],
		['Trip to Japan', 'plane'],
		['Read a book', 'bookmark'],
		['Quarterly review', 'chart'],
		['Settlement day', 'household'],
		['Games night', 'dice'],
		['Catch up with Sam', 'users'],
		['Dentist appointment', 'calendar'],
		['Clean the bathroom', 'broom'],
		['Run errands', 'checklist'],
		['Vacuum under the couch', 'vacuum'],
		['Drive Chris to school', 'car'],
		['Drinks with Sam', 'wine'],
		['Read the new Pokemon book', 'pokeball'],
		['Buy a new couch', 'sofa'],
		['Walk', 'activity'],
		['Feed the dog', 'paw'],
		['Unload the dishwasher', 'dishes'],
		['Hang out the washing', 'laundry'],
		['Order pizza', 'pizza'],
		['Switch the lights off', 'lightbulb'],
		['Fix the tap', 'settings'],
		['Mow the lawn', 'plant'],
		['Secret Santa', 'gift'],
		['Christmas lights', 'bauble'],
		['Feed the cat', 'paw'],
		['Prune the tree', 'plant'],
		['Due date', 'flag'],
		['Date night', 'heart'],
		['Pick up Chris from the airport', 'plane'],
		['Post the parcel', 'send'],
		['FaceTime nan', 'video-call'],
		['Text Sam back', 'message'],
		['Skiing at Thredbo', 'snowflake'],
		['Beach day', 'sun'],
		['Hike in the Blue Mountains', 'compass'],
		['Make the bed', 'bed'],
		['Plan Sam’s birthday', 'gift'],
		['Quiz night at the pub', 'dice'],
		['Something random', null],
		['Sort out tax return', 'receipt'],
		['Ring the plumber', 'call']
	])('%s → %s', (text, icon) => {
		expect(pickIcon(text)?.icon ?? null).toBe(icon);
	});
});

describe('planIcon and taskIcon', () => {
	it('falls back to the notes', () => {
		expect(planIcon({ title: 'Saturday', notes: 'Mario Kart tournament at ours' })).toBe(
			'switch-controller'
		);
	});

	it('gives every dinner a picture, the dish’s own where there is one', () => {
		expect(taskIcon({ title: 'Dinner', recipe: { title: 'Pizza night' } })).toBe('pizza');
		expect(taskIcon({ title: 'Dinner', recipe: { title: 'Chicken pesto pasta' } })).toBe(
			'cooking-pot'
		);
		expect(taskIcon({ title: 'Dinner', recipe: { title: 'Ginger pork lettuce cups' } })).toBe(
			'cooking-pot'
		);
		expect(
			taskIcon({ title: 'Dinner', recipe: { title: 'Lemon and herb chicken tray bake' } })
		).toBe('cooking-pot');
		expect(taskIcon({ title: 'Bake', recipe: null })).toBe('cake');
	});

	it('leaves a chore it doesn’t understand plain', () => {
		expect(taskIcon({ title: 'Sort the thing' })).toBeNull();
	});
});

describe('reading', () => {
	it('splits verb, subject and context', () => {
		expect(read('Play pokemon with chris')).toMatchObject({
			verb: ['plai'],
			subject: ['pokemon'],
			context: ['chris']
		});
	});

	it('doesn’t take a plural noun for a command', () => {
		expect(read('Drinks with Sam').verb).toBeNull();
	});

	it('stems words and their endings alike', () => {
		expect(stem('parties')).toBe(stem('party'));
		expect(stem('running')).toBe(stem('run'));
		expect(stem('baking')).toBe(stem('bake'));
		expect(stem('movies')).toBe(stem('movie'));
		expect(normalise("Chris's Pokémon")).toBe('chris pokemon');
	});
});

describe('registry', () => {
	it('only names icons that exist', () => {
		for (const meaning of MEANINGS) expect(GLYPHS).toHaveProperty(meaning.id);
	});

	it('gives each icon one entry', () => {
		const ids = MEANINGS.map((meaning) => meaning.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
