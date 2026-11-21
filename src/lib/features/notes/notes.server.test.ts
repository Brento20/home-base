import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({
	NOTES_KEY: btoa(String.fromCharCode(...new Uint8Array(32).map((_, index) => index + 1)))
}));
vi.mock('$app/env/private', () => env);
vi.mock('#lib/features/household/household.server.js', () => ({
	getHouseholdId: async () => 'home-1'
}));

const { createNote, getNote, listNotes, updateNote } = await import('./notes.server.js');

interface Row {
	id: string;
	household_id: string;
	title: string;
	body: string;
	is_secret: boolean;
	updated_at: string;
}

/** Just enough of supabase-js's query builder for the notes code. */
function fakeDatabase(rows: Row[]) {
	const from = () => {
		const filters: [string, unknown][] = [];
		let change: Partial<Row> | null = null;
		const matching = () =>
			rows.filter((row) => filters.every(([k, v]) => row[k as keyof Row] === v));
		const builder = {
			select: () => builder,
			order: () => builder,
			eq: (column: string, value: unknown) => (filters.push([column, value]), builder),
			update: (values: Partial<Row>) => ((change = values), builder),
			insert: async (values: Omit<Row, 'id' | 'updated_at'>) => {
				rows.push({ id: `n${rows.length + 1}`, updated_at: 'now', ...values });
				return { error: null };
			},
			maybeSingle: async () => ({ data: matching()[0] ?? null, error: null }),
			then: (done: (result: { data: Row[]; error: null }) => void) => {
				if (change) for (const row of matching()) Object.assign(row, change);
				done({ data: matching(), error: null });
			}
		};
		return builder;
	};
	return { from } as unknown as App.Locals['supabase'];
}

const locals = (rows: Row[]) => ({ supabase: fakeDatabase(rows) }) as App.Locals;
const row = (id: string, body: string, isSecret: boolean): Row => ({
	id,
	household_id: 'home-1',
	title: id,
	body,
	is_secret: isSecret,
	updated_at: '2026-11-01'
});

describe('secret notes in the database', () => {
	beforeEach(() => {
		env.NOTES_KEY = btoa(String.fromCharCode(...new Uint8Array(32).map((_, index) => index + 1)));
	});

	it('seals secret notes on save and opens them on read', async () => {
		const rows: Row[] = [];
		await createNote(locals(rows), { title: 'Wifi', body: 'hunter2', isSecret: true });
		await createNote(locals(rows), { title: 'Bins', body: 'Tuesday', isSecret: false });
		expect(rows[0].body).toMatch(/^enc:v1:/);
		expect(rows[1].body).toBe('Tuesday');

		const notes = await listNotes(locals(rows));
		expect(notes.map((note) => note.body).sort()).toEqual(['Tuesday', 'hunter2']);
	});

	it('seals old secret notes the first time they’re read', async () => {
		const rows = [row('old', 'door 4512', true), row('plain', 'hello', false)];
		const notes = await listNotes(locals(rows));
		expect(notes.find((note) => note.id === 'old')?.body).toBe('door 4512');
		expect(rows[0].body).toMatch(/^enc:v1:/);
		expect(rows[1].body).toBe('hello');
	});

	it('stores a note as typed once it stops being secret', async () => {
		const rows: Row[] = [];
		await createNote(locals(rows), { title: 'Wifi', body: 'hunter2', isSecret: true });
		await updateNote(locals(rows), 'n1', { title: 'Wifi', body: 'hunter2', isSecret: false });
		expect(rows[0].body).toBe('hunter2');
	});

	it('shows a note it can’t open as locked, and won’t let it be edited over', async () => {
		const rows: Row[] = [];
		await createNote(locals(rows), { title: 'Wifi', body: 'hunter2', isSecret: true });
		env.NOTES_KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});

		const [note] = await listNotes(locals(rows));
		expect(note).toMatchObject({ locked: true, body: '' });
		await expect(getNote(locals(rows), 'n1')).rejects.toMatchObject({ status: 503 });
		log.mockRestore();
	});

	it('stores notes as typed when there’s no key', async () => {
		env.NOTES_KEY = undefined as unknown as string;
		const rows: Row[] = [];
		await createNote(locals(rows), { title: 'Wifi', body: 'hunter2', isSecret: true });
		expect(rows[0].body).toBe('hunter2');
	});
});
