import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({
	refreshAll: vi.fn(async () => {}),
	invalidate: vi.fn(async (_key: string) => {})
}));
const state = vi.hoisted(() => ({
	page: { data: {} as Record<string, unknown>, url: { href: 'https://home.test/' } }
}));
vi.mock('$app/navigation', () => navigation);
vi.mock('$app/state', () => state);

const { refresh, SaveEach, settled } = await import('./save.svelte.js');

type Result = { type: 'success' | 'failure'; status: number; data?: Record<string, unknown> };

/** A stand-in for one tap: runs the submit function and hands back a way to answer it. */
async function tap(submit: ReturnType<InstanceType<typeof SaveEach>['for']>, fields = {}) {
	const formData = new FormData();
	for (const [name, value] of Object.entries(fields)) formData.set(name, String(value));
	const controller = new AbortController();
	let cancelled = false;
	const callback = await submit({
		action: new URL('https://home.test/?/save'),
		formData,
		formElement: {} as HTMLFormElement,
		controller,
		submitter: null,
		cancel: () => (cancelled = true)
	});
	return {
		cancelled,
		answer: (result: Result = { type: 'success', status: 200 }) =>
			(callback as (input: unknown) => Promise<void>)({
				result,
				update: vi.fn(async () => {}),
				action: new URL('https://home.test/?/save'),
				formData,
				formElement: {}
			})
	};
}

beforeEach(() => {
	navigation.refreshAll.mockClear();
	navigation.invalidate.mockClear();
	state.page.data = {};
});

describe('refresh', () => {
	it('shares one reload between saves that land together', async () => {
		await Promise.all([refresh(), refresh(), refresh()]);
		expect(navigation.refreshAll).toHaveBeenCalledTimes(1);
	});

	it('gathers what’s asked for during a reload into one more after it', async () => {
		let finish = () => {};
		navigation.refreshAll.mockImplementationOnce(
			() => new Promise<void>((resolve) => (finish = resolve))
		);
		const first = refresh();
		await new Promise((resolve) => setTimeout(resolve, 50));
		const second = refresh(['app:live']);
		const third = refresh(['app:feed']);
		finish();
		await Promise.all([first, second, third]);
		expect(navigation.refreshAll).toHaveBeenCalledTimes(1);
		expect(navigation.invalidate.mock.calls.map(([key]) => key).sort()).toEqual([
			'app:feed',
			'app:live'
		]);
	});

	it('does nothing for "none"', async () => {
		await refresh('none');
		expect(navigation.refreshAll).not.toHaveBeenCalled();
		expect(navigation.invalidate).not.toHaveBeenCalled();
	});

	it('waits for streamed data before it’s done', async () => {
		let land = () => {};
		state.page.data = { feed: new Promise<void>((resolve) => (land = resolve)) };
		let done = false;
		const waiting = settled().then(() => (done = true));
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(done).toBe(false);
		land();
		await waiting;
		expect(done).toBe(true);
	});
});

describe('SaveEach', () => {
	it('keeps the newest tap’s change when an older tap finishes first', async () => {
		const saves = new SaveEach<boolean>({
			optimistic: ({ formData }) => formData.get('checked') === 'true'
		});
		const first = await tap(saves.for('milk'), { checked: true });
		const second = await tap(saves.for('milk'), { checked: false });
		expect(saves.pending('milk')).toBe(false);
		await first.answer();
		expect(saves.pending('milk')).toBe(false);
		expect(saves.busy('milk')).toBe(true);
		await second.answer();
		expect(saves.pending('milk')).toBeUndefined();
		expect(saves.busy('milk')).toBe(false);
	});

	it('keeps rows apart', async () => {
		const saves = new SaveEach<boolean>({ optimistic: () => true });
		const milk = await tap(saves.for('milk'));
		await tap(saves.for('eggs'));
		await milk.answer();
		expect(saves.pending('milk')).toBeUndefined();
		expect(saves.pending('eggs')).toBe(true);
	});

	it('with serial, sends a tap only once the one before is answered', async () => {
		const saves = new SaveEach({ serial: true, refresh: 'none' });
		const first = await tap(saves.for());
		let sent = false;
		const second = tap(saves.for()).then((handle) => {
			sent = true;
			return handle;
		});
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(sent).toBe(false);
		await first.answer();
		await (await second).answer();
		expect(sent).toBe(true);
	});

	it('stops a save when start says no, and shows nothing', async () => {
		const saves = new SaveEach<boolean>({ start: () => false, optimistic: () => true });
		const handle = await tap(saves.for());
		expect(handle.cancelled).toBe(true);
		expect(saves.pending()).toBeUndefined();
		expect(saves.busy()).toBe(false);
	});

	it('puts things back and skips the reload when the save fails', async () => {
		const after = vi.fn();
		const saves = new SaveEach<boolean>({ optimistic: () => true, after });
		const handle = await tap(saves.for());
		await handle.answer({ type: 'failure', status: 400 });
		expect(saves.pending()).toBeUndefined();
		expect(navigation.refreshAll).not.toHaveBeenCalled();
		expect(after).toHaveBeenCalledWith(expect.objectContaining({ type: 'failure' }), {
			key: '',
			value: true
		});
	});
});
