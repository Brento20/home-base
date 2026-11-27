import { error, json } from '@sveltejs/kit';
import { ALL_GROUPS, type NotificationGroup } from '#lib/features/notifications/describe.js';
import {
	getPhone,
	removePhone,
	savePhone,
	testPhone,
	updatePhone
} from '#lib/features/notifications/notifications.server.js';
import type { RequestHandler } from './$types';

/**
 * This phone's notifications, for the settings page's script (NotificationSettings.svelte):
 * POST turns them on with the browser's push subscription, PUT changes the kinds and quiet
 * hours, DELETE turns them off, PATCH sends a test to this phone, and a POST with only an
 * endpoint reads its settings back.
 */

async function body(request: Request): Promise<Record<string, unknown>> {
	try {
		const value = await request.json();
		return value && typeof value === 'object' ? value : {};
	} catch {
		error(400, 'Expected JSON.');
	}
}

const text = (value: unknown, max: number) =>
	typeof value === 'string' && value.length <= max ? value : null;

const hour = (value: unknown) =>
	typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23 ? value : null;

export const POST: RequestHandler = async ({ request, locals }) => {
	const input = await body(request);
	const endpoint = text(input.endpoint, 1000);
	if (!endpoint) error(400, 'No push address.');
	const keys = (input.keys ?? {}) as Record<string, unknown>;
	const p256dh = text(keys.p256dh, 120);
	const auth = text(keys.auth, 40);
	// Just asking what this phone's set to.
	if (!p256dh || !auth) return json({ settings: await getPhone(locals, endpoint) });
	const timeZone = text(input.timeZone, 60) ?? 'Australia/Sydney';
	try {
		return json({ settings: await savePhone(locals, { endpoint, p256dh, auth }, timeZone) });
	} catch (problem) {
		error(400, problem instanceof Error ? problem.message : 'Couldn’t turn them on.');
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const input = await body(request);
	const endpoint = text(input.endpoint, 1000);
	if (!endpoint) error(400, 'No push address.');
	const groups = Array.isArray(input.groups)
		? ALL_GROUPS.filter((group) => (input.groups as unknown[]).includes(group))
		: ALL_GROUPS;
	const settings = await updatePhone(locals, endpoint, {
		groups: groups as NotificationGroup[],
		quietFrom: hour(input.quietFrom),
		quietTo: hour(input.quietTo)
	});
	if (!settings) error(404, 'Turn notifications on first.');
	return json({ settings });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const input = await body(request);
	const endpoint = text(input.endpoint, 1000);
	if (endpoint) await removePhone(locals, endpoint);
	return json({ settings: null });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const input = await body(request);
	const endpoint = text(input.endpoint, 1000);
	if (!endpoint) error(400, 'No push address.');
	return json({ result: await testPhone(locals, endpoint) });
};
