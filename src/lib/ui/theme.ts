/**
 * Appearance: light or dark, and which colour theme fills the background in the morning,
 * through the day and in the evening. Each person picks their own, written "dark.tide.dune.ember"
 * and kept in three places:
 * - the `hb-theme` cookie, so the page is right before it's drawn: the server writes the mode
 *   into the page (hooks.server.ts) and the inline script in app.html picks the theme for the
 *   time of day;
 * - localStorage, which the inline script falls back to (and copies back into the cookie) if the
 *   cookie's been cleared;
 * - the person's profile in Supabase (`profiles.theme`, via /account/theme), so it survives both
 *   being cleared and follows them to another phone. The server restores the cookie from it when
 *   a signed-in request arrives without one.
 * The device's copy wins while it has one, so a tap is never undone by a slower save.
 * The colours themselves are written once, here, as CSS (`themeCss`), so the settings swatches
 * and the app can't drift apart.
 */
import type { Daypart } from './daypart.js';

export type Mode = 'dark' | 'light';

export interface PaletteColours {
	/** The base the glows sit on. */
	ground: string;
	/** Buttons, links, highlights. Dark mode's are light; light mode's are deep, for contrast. */
	accent: string;
	/** The three glows' colours, alpha included: the big top glow, the side one, the low one. */
	glows: [string, string, string];
}

export interface Palette {
	id: string;
	name: string;
	dark: PaletteColours;
	light: PaletteColours;
}

export const PALETTES: Palette[] = [
	{
		id: 'ember',
		name: 'Ember',
		dark: {
			ground: '#0b0807',
			accent: '#f4a86e',
			glows: ['rgb(218 100 36 / 0.6)', 'rgb(112 26 40 / 0.55)', 'rgb(160 72 30 / 0.28)']
		},
		light: {
			ground: '#f7f0ea',
			accent: '#a84b17',
			glows: ['rgb(255 160 104 / 0.5)', 'rgb(232 128 140 / 0.36)', 'rgb(250 196 140 / 0.42)']
		}
	},
	{
		id: 'tide',
		name: 'Tide',
		dark: {
			ground: '#080b0f',
			accent: '#a6cbec',
			glows: ['rgb(64 112 168 / 0.58)', 'rgb(52 122 106 / 0.42)', 'rgb(200 152 82 / 0.26)']
		},
		light: {
			ground: '#eef3f7',
			accent: '#285f96',
			glows: ['rgb(130 182 236 / 0.5)', 'rgb(120 206 186 / 0.38)', 'rgb(244 206 150 / 0.4)']
		}
	},
	{
		id: 'dune',
		name: 'Dune',
		dark: {
			ground: '#0a0909',
			accent: '#efc49c',
			glows: ['rgb(176 112 76 / 0.46)', 'rgb(84 52 64 / 0.48)', 'rgb(120 96 72 / 0.24)']
		},
		light: {
			ground: '#f6f1eb',
			accent: '#8f5a24',
			glows: ['rgb(236 190 150 / 0.5)', 'rgb(206 168 184 / 0.36)', 'rgb(226 206 176 / 0.44)']
		}
	},
	{
		id: 'rose',
		name: 'Rose',
		dark: {
			ground: '#0d0809',
			accent: '#f2a7c0',
			glows: ['rgb(200 70 112 / 0.52)', 'rgb(104 30 72 / 0.5)', 'rgb(176 86 104 / 0.26)']
		},
		light: {
			ground: '#f8eff2',
			accent: '#a8365f',
			glows: ['rgb(246 150 184 / 0.48)', 'rgb(212 150 216 / 0.34)', 'rgb(252 190 170 / 0.4)']
		}
	},
	{
		id: 'fern',
		name: 'Fern',
		dark: {
			ground: '#070a08',
			accent: '#acd8a2',
			glows: ['rgb(62 132 82 / 0.5)', 'rgb(30 82 66 / 0.48)', 'rgb(140 150 70 / 0.24)']
		},
		light: {
			ground: '#eff4ee',
			accent: '#38712f',
			glows: ['rgb(150 210 150 / 0.48)', 'rgb(120 200 190 / 0.34)', 'rgb(220 226 150 / 0.4)']
		}
	},
	{
		id: 'dusk',
		name: 'Dusk',
		dark: {
			ground: '#09080d',
			accent: '#c5b4f4',
			glows: ['rgb(110 82 196 / 0.54)', 'rgb(48 40 124 / 0.5)', 'rgb(170 100 152 / 0.26)']
		},
		light: {
			ground: '#f2f0f8',
			accent: '#5f45b8',
			glows: ['rgb(176 156 246 / 0.48)', 'rgb(140 170 240 / 0.34)', 'rgb(240 176 214 / 0.4)']
		}
	},
	{
		id: 'slate',
		name: 'Slate',
		dark: {
			ground: '#0a0a0a',
			accent: '#d9d3cc',
			glows: ['rgb(120 120 128 / 0.4)', 'rgb(68 70 82 / 0.44)', 'rgb(112 106 100 / 0.22)']
		},
		light: {
			ground: '#f2f1ef',
			accent: '#4f4a44',
			glows: ['rgb(196 196 204 / 0.5)', 'rgb(176 186 200 / 0.36)', 'rgb(214 206 196 / 0.42)']
		}
	}
];

export interface ThemeChoice {
	mode: Mode;
	morning: string;
	day: string;
	evening: string;
}

/** What everyone starts with: the app's look before themes existed. */
export const DEFAULT_THEME: ThemeChoice = {
	mode: 'dark',
	morning: 'tide',
	day: 'dune',
	evening: 'ember'
};

export const THEME_COOKIE = 'hb-theme';

const isPalette = (id: string | undefined) => PALETTES.some((palette) => palette.id === id);

/** "dark.tide.dune.ember" → a choice; anything unreadable falls back to the default. */
export function parseTheme(value: string | null | undefined): ThemeChoice {
	const [mode, morning, day, evening] = (value ?? '').split('.');
	return {
		mode: mode === 'light' ? 'light' : 'dark',
		morning: isPalette(morning) ? morning : DEFAULT_THEME.morning,
		day: isPalette(day) ? day : DEFAULT_THEME.day,
		evening: isPalette(evening) ? evening : DEFAULT_THEME.evening
	};
}

export const serialiseTheme = (theme: ThemeChoice) =>
	[theme.mode, theme.morning, theme.day, theme.evening].join('.');

export function paletteFor(theme: ThemeChoice, daypart: Daypart) {
	return PALETTES.find((palette) => palette.id === theme[daypart]) ?? PALETTES[0];
}

/** A year: the cookie's life, refreshed on every save. */
export const THEME_MAX_AGE = 60 * 60 * 24 * 365;

let profileSave: ReturnType<typeof setTimeout> | undefined;

/**
 * Saves the choice and repaints straight away: on this device at once (cookie and
 * localStorage), and to your profile a moment later, once you've stopped tapping.
 */
export function saveTheme(theme: ThemeChoice, daypart: Daypart) {
	const value = serialiseTheme(theme);
	document.cookie = `${THEME_COOKIE}=${value}; path=/; max-age=${THEME_MAX_AGE}; samesite=lax`;
	try {
		localStorage.setItem(THEME_COOKIE, value);
	} catch {
		// Private browsing can refuse storage; the cookie and the profile still have it.
	}
	paintTheme(theme, daypart);

	clearTimeout(profileSave);
	profileSave = setTimeout(() => {
		fetch('/account/theme', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ theme: value }),
			keepalive: true
		}).catch(() => {
			// Offline: the device keeps it, and the next change saves it.
		});
	}, 600);
}

/** Puts a theme on the page: <html data-mode data-palette>, and the browser's own colours. */
export function paintTheme(theme: ThemeChoice, daypart: Daypart) {
	const root = document.documentElement;
	const palette = paletteFor(theme, daypart);
	root.dataset.mode = theme.mode;
	root.dataset.palette = palette.id;
	root.dataset.daypart = daypart;
	document
		.querySelector('meta[name="theme-color"]')
		?.setAttribute('content', palette[theme.mode].ground);
	document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme.mode);
}

/** Reads the theme from a Cookie header or document.cookie. */
export function themeFromCookies(cookies: string) {
	const match = cookies.match(new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]*)`));
	return parseTheme(match?.[1]);
}

/**
 * The inline script in app.html (written in by hooks.server.ts): picks this device's theme for
 * the household's time of day before first paint, so there's no flash. Kept in step with
 * `daypartAt` and `paintTheme`, from the same palettes.
 */
export function themeScript(timeZone: string) {
	const grounds = Object.fromEntries(
		PALETTES.map((palette) => [
			palette.id,
			{ dark: palette.dark.ground, light: palette.light.ground }
		])
	);
	return `(function(){try{var G=${JSON.stringify(grounds)},D=${JSON.stringify(DEFAULT_THEME)};var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=([^;]*)/);var s=m?m[1]:'';if(!s){try{s=localStorage.getItem('${THEME_COOKIE}')||'';if(s)document.cookie='${THEME_COOKIE}='+s+'; path=/; max-age=${THEME_MAX_AGE}; samesite=lax'}catch(e){}}else{try{localStorage.setItem('${THEME_COOKIE}',s)}catch(e){}}var v=s.split('.');var t={mode:v[0]==='light'?'light':'dark',morning:G[v[1]]?v[1]:D.morning,day:G[v[2]]?v[2]:D.day,evening:G[v[3]]?v[3]:D.evening};var q=new URLSearchParams(location.search).get('daypart');var h=Number(new Intl.DateTimeFormat('en-AU',{hour:'numeric',hourCycle:'h23',timeZone:${JSON.stringify(timeZone)}}).format(new Date()));var p=h>=5&&h<11?'morning':h>=11&&h<17?'day':'evening';if(q==='morning'||q==='day'||q==='evening')p=q;var r=document.documentElement;r.dataset.daypart=p;r.dataset.mode=t.mode;r.dataset.palette=t[p];var c=document.querySelector('meta[name="theme-color"]');if(c)c.setAttribute('content',G[t[p]][t.mode]);}catch(e){}})();`;
}

/** Every palette in both modes, as CSS: `:root[data-mode][data-palette]` blocks. */
export function themeCss() {
	return PALETTES.flatMap((palette) =>
		(['dark', 'light'] as const).map((mode) => {
			const colours = palette[mode];
			return `:root[data-mode='${mode}'][data-palette='${palette.id}']{--colour-ground:${colours.ground};--colour-accent:${colours.accent};--glow-one:${colours.glows[0]};--glow-two:${colours.glows[1]};--glow-three:${colours.glows[2]}}`;
		})
	).join('');
}
