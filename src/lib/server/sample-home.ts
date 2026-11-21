import { DEFAULT_HOME, type HomeSettings } from '#lib/home.js';

/**
 * The sample home's time zone and currency (Home settings can change them in sample mode).
 * Its own module, not in sample-data.ts: the hooks import it, and sample-data makes random ids
 * as it loads, which Cloudflare Workers refuse at start-up (every page would fail).
 */
export const sampleHome: HomeSettings = { ...DEFAULT_HOME };
