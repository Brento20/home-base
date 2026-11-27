import { describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '', VAPID_SUBJECT: '' }));
vi.mock('$app/env/private', () => env);

const { deliverPushes, pushPayload } = await import('./notifications.server.js');

async function keys() {
	const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
		'sign',
		'verify'
	])) as CryptoKeyPair;
	const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
	const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
	env.VAPID_PUBLIC_KEY = btoa(String.fromCharCode(...raw))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
	env.VAPID_PRIVATE_KEY = jwk.d!;
}

// A real phone key (RFC 8291's example), so the message can actually be sealed.
const PHONE = {
	p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
	auth: 'BTBZMqHH6r4Tts7J_aSIgg'
};

const row = (endpoint: string) => ({
	notification_id: 'n-1',
	kind: 'expense' as const,
	actor_name: 'Chris',
	subject: 'Groceries',
	detail: '',
	place: 'Our Place',
	amount_cents: 12000,
	currency: 'AUD',
	starts_at: null,
	unread: 3,
	endpoint,
	...PHONE,
	time_zone: 'Australia/Sydney'
});

function locals(rows: unknown[]) {
	const rpc = vi.fn(async (name: string) =>
		name === 'claim_my_pushes' ? { data: rows, error: null } : { error: null }
	);
	return {
		rpc,
		locals: { supabase: { rpc }, user: { id: 'me', email: null } } as unknown as App.Locals
	};
}

describe('pushPayload', () => {
	it('carries the words, the way back to the notification and the new badge count', () => {
		expect(pushPayload(row('https://web.push.apple.com/a'))).toEqual({
			title: 'Chris added Groceries',
			body: '$120.00 in Our Place',
			url: '/notifications/n-1',
			tag: 'n-1',
			badge: 3
		});
	});
});

describe('deliverPushes', () => {
	it('does nothing until the push keys are set', async () => {
		env.VAPID_PUBLIC_KEY = '';
		const { locals: l, rpc } = locals([]);
		await deliverPushes(l);
		expect(rpc).not.toHaveBeenCalled();
	});

	it('sends each claimed push, and forgets a phone the push service says is gone', async () => {
		await keys();
		const { locals: l, rpc } = locals([
			row('https://web.push.apple.com/live'),
			row('https://fcm.googleapis.com/fcm/send/gone'),
			row('https://evil.example.com/nope')
		]);
		const send = vi.fn(
			async (url: string) => new Response(null, { status: url.includes('gone') ? 410 : 201 })
		);
		await deliverPushes(l, send as unknown as typeof fetch);
		// They go out together, so in no particular order.
		const sentTo = send.mock.calls.map(([url]) => url).sort();
		expect(sentTo).toEqual(
			['https://web.push.apple.com/live', 'https://fcm.googleapis.com/fcm/send/gone'].sort()
		);
		expect(rpc).toHaveBeenCalledWith('drop_push_subscription', {
			endpoint: 'https://fcm.googleapis.com/fcm/send/gone'
		});
		expect(rpc).not.toHaveBeenCalledWith('drop_push_subscription', {
			endpoint: 'https://web.push.apple.com/live'
		});
	});
});
