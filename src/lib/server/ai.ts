/**
 * The AI helpers' one door to Claude. Server-only: the key never reaches the browser.
 *
 * Everything here is optional and allowed to fail. Each helper fills in an ordinary form for a
 * person to check and save, so when this returns null (no key, a timeout, an odd answer), the
 * page just shows the form empty with a friendly "enter it manually" line (AI_OOPS in voice.ts).
 */
import { ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { aiLimiter } from './background.js';

/** False when no key is set: the helpers hide, and every form works by hand as before. */
export const aiConfigured = Boolean(ANTHROPIC_API_KEY);

/** Quick text jobs (quick add, the weekly line, a recipe from text). */
const FAST_MODEL = 'claude-haiku-5-5';
/** Reading photos (receipts, a cookbook page), where accuracy matters more than speed. */
const SHARP_MODEL = 'claude-sonnet-5-5';

/** Photos the API reads. The browser shrinks them to a 1600 px JPEG before upload anyway. */
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

type ContentBlock =
	| { type: 'text'; text: string }
	| { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

/** A JSON Schema for the answer. Every object needs `additionalProperties: false`. */
type Schema = Record<string, unknown>;

interface Ask {
	/** 'sharp' for photos; 'fast' for everything else. */
	model?: 'fast' | 'sharp';
	system: string;
	content: string | ContentBlock[];
	schema: Schema;
	maxTokens?: number;
	timeoutMs?: number;
}

/**
 * A cap on AI calls per person, so one account (or a script using it) can't run up the bill:
 * AI_PER_MINUTE a minute each. Deployed, Cloudflare's rate limiter counts (the AI_LIMITER
 * binding in wrangler.jsonc, keyed by the person's id); anywhere without it (dev, preview) a
 * simple count in memory stands in. Over the cap, the helper fails like any other hiccup: the
 * form stays empty with the usual "enter it manually" line.
 */
export const AI_PER_MINUTE = 10;
const recentCalls = new Map<string, number[]>();

export async function aiAllowed(): Promise<boolean> {
	let event;
	try {
		event = getRequestEvent();
	} catch {
		return true; // Not inside a request (a test): nothing to count against.
	}
	const who = event.locals.user?.id ?? event.getClientAddress();
	const limiter = aiLimiter();
	if (limiter) {
		try {
			return (await limiter.limit({ key: who })).success;
		} catch {
			return true; // The limiter itself failing shouldn't take the helpers down.
		}
	}
	const now = Date.now();
	const calls = (recentCalls.get(who) ?? []).filter((at) => now - at < 60_000);
	if (calls.length >= AI_PER_MINUTE) return false;
	recentCalls.set(who, [...calls, now]);
	return true;
}

/**
 * Asks Claude for an answer shaped like `schema`. Returns the parsed answer, or null if anything
 * at all goes wrong: the caller falls back to the empty form.
 */
export async function askForJson<T>({
	model = 'fast',
	system,
	content,
	schema,
	maxTokens = 1500,
	timeoutMs = 25_000
}: Ask): Promise<T | null> {
	if (!ANTHROPIC_API_KEY) return null;
	if (!(await aiAllowed())) {
		console.warn('AI helper skipped: over the per-person limit');
		return null;
	}
	const base = (ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');

	try {
		const response = await fetch(`${base}/v1/messages`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-api-key': ANTHROPIC_API_KEY,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: model === 'sharp' ? SHARP_MODEL : FAST_MODEL,
				max_tokens: maxTokens,
				system,
				messages: [{ role: 'user', content }],
				output_config: { format: { type: 'json_schema', schema } }
			}),
			signal: stopWhen(timeoutMs)
		});

		if (!response.ok) {
			// The body says why (bad key, overloaded, too large); it never includes the key.
			console.error('[ai] request failed', response.status, (await response.text()).slice(0, 300));
			return null;
		}

		const message = (await response.json()) as {
			stop_reason?: string;
			content?: { type: string; text?: string }[];
		};
		if (message.stop_reason !== 'end_turn') {
			console.error('[ai] stopped early:', message.stop_reason);
			return null;
		}
		const text = message.content?.find((block) => block.type === 'text')?.text;
		return text ? (JSON.parse(text) as T) : null;
	} catch (problem) {
		console.error('[ai] no answer:', problem instanceof Error ? problem.message : problem);
		return null;
	}
}

/**
 * Gives up after `timeoutMs`, or as soon as the person stops waiting (the helper's "I'll do it
 * myself" drops the request), so nobody pays for an answer no one will see.
 */
function stopWhen(timeoutMs: number): AbortSignal {
	const timeout = AbortSignal.timeout(timeoutMs);
	try {
		return AbortSignal.any([timeout, getRequestEvent().request.signal]);
	} catch {
		return timeout; // Outside a request, or no AbortSignal.any.
	}
}

/** A photo from a form, ready to send; null if it's missing, not a photo, or too big. */
export async function imageBlock(file: FormDataEntryValue | null): Promise<ContentBlock | null> {
	if (!(file instanceof File) || file.size === 0) return null;
	if (!IMAGE_TYPES.has(file.type) || file.size > IMAGE_MAX_BYTES) return null;

	const bytes = new Uint8Array(await file.arrayBuffer());
	let binary = '';
	// In slices, so a large photo doesn't overflow the argument list.
	for (let i = 0; i < bytes.length; i += 0x8000)
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return { type: 'image', source: { type: 'base64', media_type: file.type, data: btoa(binary) } };
}

/** A text block, for mixing with a photo. */
export const textBlock = (text: string): ContentBlock => ({ type: 'text', text });

/** "Thursday 19 November 2026 (2026-11-19)": so "next Tuesday" lands on the right day. */
export function todayForPrompt(todayISO: string) {
	const day = new Date(`${todayISO}T12:00:00Z`).toLocaleDateString('en-AU', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});
	return `${day} (${todayISO})`;
}
