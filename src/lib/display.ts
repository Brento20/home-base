/**
 * Display preferences: a few independent ways for each person to make home base calmer to look
 * at, without changing it for anyone else in the home. Kept on the person's profile
 * (`profiles.display_prefs`), read with the profile on every request (hooks.server.ts), so the
 * first paint is already right. Anything missing or unknown falls back to the default, which is
 * home base as designed.
 */

import { NUDGE_AMOUNTS, type NudgeAmount } from '#lib/features/expenses/nudge.js';

export const CARD_LIMITS = [1, 3, 5] as const;
export type CardLimit = (typeof CARD_LIMITS)[number] | 'all';

export interface DisplayPrefs {
	/** Tone down the decorative glows (the backdrop's, the next plan's). */
	reduceGlow: boolean;
	/** Placeholders and headings stay put instead of changing. */
	staticPlaceholders: boolean;
	/** No summary line under the date on Today. */
	hideDailySummary: boolean;
	/** How many of Today's coming-up cards show before "Show N more". */
	todayCardLimit: CardLimit;
	/** Today's coming-up as the big swipeable cards, or a compact list. */
	todayCardLayout: 'cards' | 'list';
	/** A gentle note on Today once you owe more than this many dollars; 0 is off. */
	settleNudge: NudgeAmount;
	/** December's snow globe behind the page: tilt to move the snow, shake to swirl it. */
	snowGlobe: boolean;
}

export const DEFAULT_DISPLAY: DisplayPrefs = {
	reduceGlow: false,
	staticPlaceholders: false,
	hideDailySummary: false,
	todayCardLimit: 'all',
	todayCardLayout: 'cards',
	settleNudge: 0,
	snowGlobe: false
};

/** Reads stored preferences, keeping only what's recognised; the rest is the default. */
export function parseDisplay(value: unknown): DisplayPrefs {
	const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
	const flag = (key: keyof DisplayPrefs) =>
		typeof raw[key] === 'boolean' ? (raw[key] as boolean) : (DEFAULT_DISPLAY[key] as boolean);
	const limit = raw.todayCardLimit;
	return {
		reduceGlow: flag('reduceGlow'),
		staticPlaceholders: flag('staticPlaceholders'),
		hideDailySummary: flag('hideDailySummary'),
		todayCardLimit:
			limit === 'all' || (CARD_LIMITS as readonly unknown[]).includes(limit)
				? (limit as CardLimit)
				: DEFAULT_DISPLAY.todayCardLimit,
		todayCardLayout: raw.todayCardLayout === 'list' ? 'list' : 'cards',
		settleNudge: (NUDGE_AMOUNTS as readonly unknown[]).includes(raw.settleNudge)
			? (raw.settleNudge as NudgeAmount)
			: 0,
		snowGlobe: flag('snowGlobe')
	};
}

/** The cookie that holds them in sample mode (no database to keep them in). */
export const DISPLAY_COOKIE = 'hb-display';
