/**
 * The Christmas snow globe: a canvas of small flakes behind the page that fall with the phone's
 * real gravity. Tilt the phone and the snow drifts that way and gathers along whichever edge
 * is down; shake it and everything lifts into a slow swirl that settles again. Without a
 * motion sensor (a laptop, or motion access turned down) it just snows, and the pointer can
 * stir it.
 *
 * How it reads the phone: gravity comes from `devicemotion`'s accelerationIncludingGravity,
 * because the tilt angles from `deviceorientation` lock up when the phone is held upright,
 * which is exactly how people hold it. Platforms disagree on that reading's sign, so the
 * orientation's front-back tilt (whose sign every platform agrees on) settles which way is
 * down. A shake is a sharp spike in `acceleration` (gravity removed).
 *
 * Smooth, and still kind to the battery: up to 60 frames a second, evenly paced (every other
 * frame on a 120Hz screen), at no more than twice standard resolution, and nothing at all while
 * the app is in the background. The tilt is smoothed and a still hand's tremble ignored, and
 * scrolling's push is spread over a few frames, so nothing jolts the flakes.
 *
 * Two touches on top: held upright, snow gathers along the top of the tab bar in clumps, like
 * wet snow on a ledge (drawn on its own strip of canvas above the bar, because the bar sits in
 * front of everything). It sticks where snow already is, stacks into mounds, holds for up to a
 * minute or so, creeps off the ends only once you really tilt, and shrinks as it melts. And every 6 to 14 seconds one close-up flake, the
 * app's snowflake icon, drifts past slowly turning, now and then tumbling over like it's in 3D.
 */
import { GLYPHS } from '#lib/icons/glyphs.js';

interface Flake {
	x: number;
	y: number;
	vx: number;
	vy: number;
	/** 0.35 (far: small, slow, faint) to 1 (near); bokeh flakes go past 1. */
	depth: number;
	/** The sprite's radius in CSS pixels. */
	radius: number;
	alpha: number;
	phase: number;
	/** Its own sway: how far (0.6–1.3) and how fast (0.7–1.2) it drifts side to side. */
	sway: number;
	swayRate: number;
	/** Seconds left resting on the floor; 0 while it's moving. */
	rest: number;
	/** Fades in after a respawn, out at the end of a rest. */
	fade: number;
	/** Resting on the tab bar rather than the floor, this far above its top edge. */
	ledge: boolean;
	lift: number;
	/** When it landed on the bar, so clumps stack in order (later ones on top). */
	order: number;
	/** How much of it shows right now, easing towards 1 in the open or SHELTERED behind a card. */
	shade: number;
}

/** The close-up flake: the snowflake icon, near the glass, turning as it drifts. */
interface Hero {
	x: number;
	y: number;
	vx: number;
	vy: number;
	/** Across, in CSS pixels. */
	size: number;
	/** 0 for the smallest (furthest off), 1 for the biggest (right up at the lens). */
	near: number;
	/** Its turn in the screen's plane, and how fast (radians a second). */
	angle: number;
	spin: number;
	/** The line it tumbles around, in its own plane. */
	axis: number;
	/** How far it's turned over around that line: 0 face on, π/2 edge on. */
	turn: number;
	tumble: { from: number; to: number; at: number } | null;
	nextTumble: number;
	age: number;
	shade: number;
	fade: number;
	leaving: boolean;
	phase: number;
}

export interface SnowGlobeOptions {
	/** Light mode gives each white flake a faint cool rim, so it shows on the pale backdrop. */
	light: boolean;
	/** Told once, when the first motion reading arrives (tilting works). */
	onSensed?: () => void;
	/** A strip of canvas in front of the tab bar, for the snow that builds up on it. */
	ledgeCanvas?: HTMLCanvasElement;
	/** Bring the first close-up flake in straight away (the short preview in Preferences). */
	heroSoon?: boolean;
}

/**
 * Cards and fields are see-through glass, so snow behind them would cross their text. Inside
 * these, a flake shows as a faint ghost: still behind the glass, never in the way of reading.
 */
const SHELTERS =
	'.glass-slot, .grouped, .roster, .nudge, .status, .field-input, .segmented, .choice-pill, .tab-bar';
/** How much of a flake shows behind a card. */
const SHELTERED = 0.16;
/**
 * A flake doesn't blink out at a card's edge: it dims over this many pixels inside the edge,
 * like going behind frosted glass, and the dimming itself eases over about a quarter second
 * (SHADE_EASE a second), so a card scrolling under a resting flake is a dissolve too.
 */
const SHELTER_FEATHER = 22;
const SHADE_EASE = 4.5;

/** Pixels per second squared for a near flake falling straight down. */
const FALL = 130;
/** How quickly the liquid slows a flake (per second); lower while swirling. */
const DRAG = 1.7;
const SWIRL_DRAG = 0.85;
/** A spike past this (m/s², gravity removed) is a shake. */
const SHAKE_AT = 9;
const MAX_DT = 1 / 20;

/** What the ledge's snow sits on, and the strip drawn over it (CSS pixels above its top edge). */
const LEDGE = '.tab-bar';
const STRIP_ABOVE = 22;
const STRIP_BELOW = 6;
/**
 * How much snow builds up on the bar. `spacing`: pixels of bar per flake it holds. `depth`: only
 * flakes this near land (the far ones drift on behind). `pile`: how many pixels a full bar heaps
 * up. `rest`: seconds a flake stays. `drift`: how high (px) the soft bank under the flakes grows.
 *
 * `clumps` (the default) behaves like wet snow: a flake landing on bare bar often bounces off,
 * but one landing on snow almost always sticks (`stick`, bare to on snow), so it gathers in
 * mounds rather than an even rim. Flakes stack on whatever's under them and sink as what's
 * below melts. It holds until the tilt passes `grip`, then slides slowly, and melts over its
 * last `melt` seconds, shrinking as it goes.
 */
export const LEDGE_STYLES = {
	dusting: { spacing: 7, depth: 0.6, pile: 2.5, rest: [4, 9], drift: 0, clump: null },
	settled: { spacing: 3, depth: 0.45, pile: 4.5, rest: [11, 20], drift: 3.5, clump: null },
	snowed: { spacing: 1.6, depth: 0.4, pile: 7, rest: [14, 26], drift: 5.5, clump: null },
	clumps: {
		spacing: 3.2,
		depth: 0.5,
		pile: 9,
		rest: [30, 70],
		drift: 0,
		clump: { stick: [0.28, 0.96], grip: 0.32, melt: 6 }
	}
} as const;
export type LedgeStyle = keyof typeof LEDGE_STYLES;
type LedgeStyleValue = (typeof LEDGE_STYLES)[LedgeStyle];

/**
 * Seconds between close-up flakes (from one leaving to the next arriving), and their size.
 * Sizes lean small, with the odd one huge (HERO_SKEW): half are under about 50px, a quarter
 * over about 85px, and now and then one is a third of the screen across. The bigger it is, the nearer the lens it's meant to
 * be, so it's softer, fainter and moves faster (`near`).
 */
const HERO_GAP = [6, 14] as const;
const HERO_SIZE = [16, 130] as const;
const HERO_SKEW = 1.8;
const HERO_LIFE = 14;
const HERO_PATH = [...GLYPHS.snowflake.matchAll(/ d="([^"]+)"/g)]
	.map((match) => match[1])
	.join(' ');

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export class SnowGlobe {
	private context: CanvasRenderingContext2D;
	private flakes: Flake[] = [];
	private sprites = new Map<number, HTMLCanvasElement>();
	private width = 0;
	private height = 0;
	private ratio = 1;
	/** Where "down" is on the screen, smoothed; length is how upright the phone is (0 flat, 1 upright). */
	private gravity = { x: 0, y: 1 };
	private target = { x: 0, y: 1 };
	/** +1 if this platform reports gravity as the spec says, -1 if inverted; 0 until known. */
	private sign = 0;
	private lastBeta: number | null = null;
	private swirl = 0;
	/** Scrolling not yet passed on to the snow. */
	private scrollKick = 0;
	private swirlTurn = 1;
	private frame = 0;
	private last = 0;
	private sinceDraw = 0;
	private time = 0;
	/** Fades the whole layer in on start and out on stop. */
	private opacity = 0;
	private stopping: (() => void) | null = null;
	private sensed = false;
	private lastShake = 0;
	private scrollY = 0;
	private shelters: { left: number; top: number; right: number; bottom: number }[] = [];
	private sheltersStale = true;
	/** The tab bar's flat top, where snow can build up; null when there's no bar on screen. */
	private ledge: { left: number; right: number; top: number } | null = null;
	private ledgeContext: CanvasRenderingContext2D | null = null;
	private stripTop = -1;
	private onLedge = 0;
	/** How much builds up on the bar (LEDGE_STYLES); changeable from the console in development. */
	ledgeStyle: LedgeStyle = 'clumps';
	/** Clumping snow: the height of the snow along the bar (2px bins), and landing order. */
	private ledgeHeights = new Float32Array(0);
	private ledgeOrder = 0;
	private hero: Hero | null = null;
	private heroAt = 0;
	private heroSprites = new Map<number, HTMLCanvasElement>();
	private cleanups: (() => void)[] = [];

	constructor(
		private canvas: HTMLCanvasElement,
		private options: SnowGlobeOptions
	) {
		this.context = canvas.getContext('2d', { alpha: true })!;
		this.ledgeContext = options.ledgeCanvas?.getContext('2d', { alpha: true }) ?? null;
	}

	/** Average velocity and how many are resting, for checking the physics in development. */
	get stats() {
		const moving = this.flakes.filter((flake) => flake.rest <= 0);
		const mean = (pick: (flake: Flake) => number) =>
			moving.reduce((sum, flake) => sum + pick(flake), 0) / Math.max(1, moving.length);
		return {
			flakes: this.flakes.length,
			resting: this.flakes.length - moving.length,
			vx: Math.round(mean((flake) => flake.vx)),
			vy: Math.round(mean((flake) => flake.vy)),
			speed: Math.round(mean((flake) => Math.hypot(flake.vx, flake.vy))),
			swirl: Math.round(this.swirl * 100) / 100,
			onLedge: this.onLedge,
			hero: this.hero
				? { size: Math.round(this.hero.size), turn: Math.round(this.hero.turn * 100) / 100 }
				: null,
			gravity: {
				x: Math.round(this.gravity.x * 100) / 100,
				y: Math.round(this.gravity.y * 100) / 100
			}
		};
	}

	/** Whether a motion sensor has been heard from (so tilting works). */
	get hasMotion() {
		return this.sensed;
	}

	start() {
		this.resize();
		this.seed();
		this.heroAt = this.options.heroSoon ? 1.2 : rand(4, 9);
		this.scrollY = window.scrollY;
		const on = <K extends keyof WindowEventMap>(
			type: K,
			listener: (event: WindowEventMap[K]) => void,
			options: AddEventListenerOptions = { passive: true }
		) => {
			window.addEventListener(type, listener, options);
			this.cleanups.push(() => window.removeEventListener(type, listener, options));
		};
		on('resize', () => this.resize());
		on('devicemotion', (event) => this.onMotion(event));
		on('deviceorientation', (event) => {
			if (event.beta !== null) this.lastBeta = event.beta;
		});
		on('scroll', () => this.onScroll());
		// Cards move with scrolling and come and go with pages: look again now and then.
		const shelterTimer = setInterval(() => (this.sheltersStale = true), 700);
		this.cleanups.push(() => clearInterval(shelterTimer));
		on('pointermove', (event) => this.onPointer(event));
		const visibility = () => {
			if (document.hidden) cancelAnimationFrame(this.frame);
			else this.loop();
		};
		document.addEventListener('visibilitychange', visibility);
		this.cleanups.push(() => document.removeEventListener('visibilitychange', visibility));
		this.loop();
	}

	/** Fades out, then stops listening and drawing. */
	stop(): Promise<void> {
		return new Promise((resolve) => {
			this.stopping = () => {
				cancelAnimationFrame(this.frame);
				this.cleanups.forEach((cleanup) => cleanup());
				this.cleanups = [];
				this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
				const strip = this.options.ledgeCanvas;
				if (strip) this.ledgeContext?.clearRect(0, 0, strip.width, strip.height);
				resolve();
			};
		});
	}

	setLight(light: boolean) {
		this.options.light = light;
		this.sprites.clear();
		this.heroSprites.clear();
	}

	/** Brings a close-up flake in now (for trying it out in development). */
	showHero() {
		this.hero = null;
		this.heroAt = this.time;
	}

	/** A shake (or a tap of the button in a demo): everything lifts and swirls. */
	shake(strength = 1) {
		const energy = 260 * strength;
		this.swirl = Math.min(1.6, this.swirl + strength);
		this.swirlTurn = Math.random() < 0.5 ? -1 : 1;
		for (const flake of this.flakes) {
			const angle = Math.random() * Math.PI * 2;
			const kick = energy * rand(0.4, 1.1) * flake.depth;
			flake.vx += Math.cos(angle) * kick;
			// Up, against gravity, more than down: snow lifts off the floor.
			flake.vy += Math.sin(angle) * kick - this.gravity.y * energy * 0.5 * flake.depth;
			flake.vx -= this.gravity.x * energy * 0.5 * flake.depth;
			flake.rest = 0;
			flake.ledge = false;
		}
		// The close-up flake is knocked about too, and flips over.
		if (this.hero) {
			const angle = Math.random() * Math.PI * 2;
			this.hero.vx += Math.cos(angle) * energy * 0.35;
			this.hero.vy += Math.sin(angle) * energy * 0.35 - this.gravity.y * energy * 0.2;
			this.hero.spin += (Math.random() < 0.5 ? -1 : 1) * strength * 0.8;
			this.startTumble(this.hero, 2);
		}
	}

	private resize() {
		// Twice standard resolution at most: enough for a small flake to glide between pixels
		// instead of stepping, at under half the pixels of a 3x screen.
		this.ratio = Math.min(2, window.devicePixelRatio || 1);
		this.sprites.clear();
		this.width = window.innerWidth;
		this.height = window.innerHeight;
		this.canvas.width = Math.round(this.width * this.ratio);
		this.canvas.height = Math.round(this.height * this.ratio);
		this.context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
		const strip = this.options.ledgeCanvas;
		if (strip && this.ledgeContext) {
			strip.width = Math.round(this.width * this.ratio);
			strip.height = Math.round((STRIP_ABOVE + STRIP_BELOW) * this.ratio);
			this.ledgeContext.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
		}
		this.heroSprites.clear();
		this.sheltersStale = true;
		const want = Math.round(Math.min(220, Math.max(70, (this.width * this.height) / 2600)));
		while (this.flakes.length < want) this.flakes.push(this.newFlake(true));
		this.flakes.length = Math.min(this.flakes.length, want);
	}

	private seed() {
		this.flakes = this.flakes.map(() => this.newFlake(true));
	}

	private newFlake(anywhere: boolean): Flake {
		// Four layers for depth: many tiny faint ones far back, fewer and brighter ones nearer,
		// and about one in twenty a big, soft, out-of-focus flake right against the glass. Each
		// flake varies within its layer, so no two rows look alike.
		const roll = Math.random();
		const layer =
			roll < 0.42
				? { depth: [0.32, 0.52], radius: [0.6, 1.2], alpha: [0.14, 0.34] }
				: roll < 0.78
					? { depth: [0.52, 0.8], radius: [1.3, 2.3], alpha: [0.36, 0.66] }
					: roll < 0.95
						? { depth: [0.8, 1], radius: [2.4, 3.5], alpha: [0.66, 0.94] }
						: { depth: [1.15, 1.35], radius: [5, 8.5], alpha: [0.05, 0.13] };
		const depth = rand(layer.depth[0], layer.depth[1]);
		const flake: Flake = {
			x: 0,
			y: 0,
			vx: rand(-8, 8),
			vy: rand(0, 20) * depth,
			depth,
			radius: rand(layer.radius[0], layer.radius[1]),
			alpha: rand(layer.alpha[0], layer.alpha[1]),
			phase: Math.random() * Math.PI * 2,
			sway: rand(0.6, 1.3),
			swayRate: rand(0.7, 1.2),
			rest: 0,
			fade: anywhere ? 1 : 0,
			shade: 1,
			ledge: false,
			order: 0,
			lift: 0
		};
		if (anywhere) {
			flake.x = Math.random() * this.width;
			flake.y = Math.random() * this.height;
		} else {
			this.placeAtCeiling(flake);
		}
		return flake;
	}

	/** Puts a flake just past the edge opposite "down", anywhere along it. */
	private placeAtCeiling(flake: Flake) {
		const { x: gx, y: gy } = this.unitGravity();
		const cx = this.width / 2;
		const cy = this.height / 2;
		const reach = Math.abs(gx) * cx + Math.abs(gy) * cy + 12;
		const across =
			(Math.random() - 0.5) * (Math.abs(gy) * this.width + Math.abs(gx) * this.height + 40);
		flake.x = cx - gx * reach - gy * across;
		flake.y = cy - gy * reach + gx * across;
		flake.vx = gx * 10;
		flake.vy = gy * 10;
	}

	private unitGravity() {
		const length = Math.hypot(this.gravity.x, this.gravity.y);
		return length < 0.2
			? { x: 0, y: 1 }
			: { x: this.gravity.x / length, y: this.gravity.y / length };
	}

	private onMotion(event: DeviceMotionEvent) {
		const reading = event.accelerationIncludingGravity;
		if (!reading || reading.x === null || reading.y === null) return;
		// Which way up: the front-back tilt's sine says whether the top of the phone points up.
		if (this.sign === 0 && this.lastBeta !== null) {
			const upright = Math.sin((this.lastBeta * Math.PI) / 180);
			if (Math.abs(upright) > 0.5 && Math.abs(reading.y) > 4)
				this.sign = Math.sign(reading.y) === Math.sign(upright) ? 1 : -1;
		}
		if (!this.sensed) {
			this.sensed = true;
			this.options.onSensed?.();
		}
		const sign = this.sign || 1;
		// Spec: the reading is the opposite of gravity, in device axes (x right, y up the screen).
		let x = (-reading.x * sign) / 9.81;
		let y = (reading.y * sign) / 9.81;
		const angle = ((screen.orientation?.angle ?? 0) * Math.PI) / 180;
		if (angle)
			[x, y] = [
				x * Math.cos(angle) + y * Math.sin(angle),
				-x * Math.sin(angle) + y * Math.cos(angle)
			];
		const length = Math.hypot(x, y);
		if (length > 1) [x, y] = [x / length, y / length];
		// Readings come in faster than they matter: smooth them, and ignore the tremble of a
		// hand holding the phone still.
		const nx = this.target.x + (x - this.target.x) * 0.25;
		const ny = this.target.y + (y - this.target.y) * 0.25;
		if (Math.hypot(nx - this.target.x, ny - this.target.y) > 0.004) this.target = { x: nx, y: ny };

		const jolt = event.acceleration;
		if (jolt && jolt.x !== null && jolt.y !== null) {
			const size = Math.hypot(jolt.x, jolt.y, jolt.z ?? 0);
			const now = performance.now();
			if (size > SHAKE_AT && now - this.lastShake > 180) {
				this.lastShake = now;
				this.shake(Math.min(1, (size - SHAKE_AT) / 14 + 0.25));
			}
		}
	}

	/** Scrolling the page drifts the snow a little the other way, like moving through it. */
	private onScroll() {
		this.sheltersStale = true;
		const delta = window.scrollY - this.scrollY;
		this.scrollY = window.scrollY;
		if (Math.abs(delta) > 200) return;
		// Spread over the next few frames: scroll events come in bursts, which made the snow jump.
		this.scrollKick += delta;
	}

	/** A mouse or finger passing through stirs the flakes near it. */
	private onPointer(event: PointerEvent) {
		if (event.pointerType === 'touch' && this.sensed) return;
		const dx = event.movementX || 0;
		const dy = event.movementY || 0;
		if (!dx && !dy) return;
		for (const flake of this.flakes) {
			const distance = Math.hypot(flake.x - event.clientX, flake.y - event.clientY);
			if (distance > 90) continue;
			const push = (1 - distance / 90) * 9 * flake.depth;
			flake.vx += dx * push;
			flake.vy += dy * push;
			flake.rest = 0;
			flake.ledge = false;
		}
	}

	private sprite(radius: number) {
		const key = Math.round(radius * 4) / 4;
		let sprite = this.sprites.get(key);
		if (sprite) return sprite;
		const size = Math.ceil(key * 2 * this.ratio) + 2;
		sprite = document.createElement('canvas');
		sprite.width = sprite.height = size;
		const paint = sprite.getContext('2d')!;
		const centre = size / 2;
		const glow = paint.createRadialGradient(centre, centre, 0, centre, centre, centre);
		const soft = key > 3.5;
		glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
		glow.addColorStop(soft ? 0.2 : 0.45, `rgba(255, 255, 255, ${soft ? 0.55 : 0.92})`);
		if (this.options.light) {
			// On a pale backdrop, snow is still white: a faint cool rim is what makes it show.
			glow.addColorStop(soft ? 0.6 : 0.72, `rgba(116, 136, 166, ${soft ? 0.18 : 0.42})`);
		}
		glow.addColorStop(1, 'rgba(116, 136, 166, 0)');
		paint.fillStyle = glow;
		paint.fillRect(0, 0, size, size);
		this.sprites.set(key, sprite);
		return sprite;
	}

	private loop = () => {
		this.frame = requestAnimationFrame((now) => {
			const dt = this.last ? Math.min(MAX_DT, (now - this.last) / 1000) : 1 / 60;
			this.last = now;
			this.step(dt);
			// Every frame up to 60 a second, evenly: on a 120Hz screen, every other one. Drawing calm
			// snow at 30 made it step visibly.
			this.sinceDraw += dt;
			if (this.sinceDraw >= 1 / 62) {
				this.draw(this.sinceDraw);
				this.sinceDraw = 0;
			}
			if (this.stopping && this.opacity <= 0) {
				this.stopping();
				return;
			}
			this.loop();
		});
	};

	private step(dt: number) {
		this.time += dt;
		this.opacity = this.stopping
			? Math.max(0, this.opacity - dt / 0.7)
			: Math.min(1, this.opacity + dt / 1.4);
		// The accelerometer is noisy: follow it slowly enough that the noise never reaches the snow.
		const ease = 1 - Math.exp(-dt * 3);
		this.gravity.x += (this.target.x - this.gravity.x) * ease;
		this.gravity.y += (this.target.y - this.gravity.y) * ease;
		this.swirl *= Math.exp(-dt / 1.6);
		const kick = this.scrollKick * (1 - Math.exp(-dt * 10));
		this.scrollKick -= kick;

		const { x: gx, y: gy } = this.gravity;
		const tilt = Math.hypot(gx, gy);
		const down = this.unitGravity();
		const cx = this.width / 2;
		const cy = this.height / 2;
		// How far "down" the floor is from the centre, along the direction of gravity.
		const floor = Math.abs(down.x) * cx + Math.abs(down.y) * cy;
		const drag = Math.exp(-dt * (DRAG + (SWIRL_DRAG - DRAG) * Math.min(1, this.swirl)));
		const spin = this.swirl * 180 * this.swirlTurn;
		// Snow builds up on the tab bar while the phone's upright enough for its top to be "up".
		const ledge = this.ledgeContext && down.y > 0.55 && tilt >= 0.2 ? this.ledge : null;
		const style = LEDGE_STYLES[this.ledgeStyle];
		const ledgeRoom = ledge ? Math.round((ledge.right - ledge.left) / style.spacing) : 0;
		let onLedge = 0;

		for (const flake of this.flakes) {
			if (flake.ledge) {
				// On the bar: slides along it as the phone tilts, falls off its ends, then melts.
				flake.rest -= dt;
				if (style.clump) {
					// Wet snow grips: nothing moves until the tilt is past `grip`, then it creeps.
					const over = Math.abs(gx) - style.clump.grip;
					if (over > 0) flake.x += Math.sign(gx) * over * 34 * dt;
				} else flake.x += gx * 40 * dt;
				if (!ledge || flake.x < ledge.left || flake.x > ledge.right || this.swirl >= 0.3) {
					flake.ledge = false;
					flake.rest = 0;
					flake.vy = 12 * flake.depth;
				} else {
					flake.y = ledge.top - flake.lift;
					flake.fade = Math.min(1, flake.rest / (style.clump ? style.clump.melt : 1.2));
					if (flake.rest <= 0) {
						flake.ledge = false;
						this.placeAtCeiling(flake);
						flake.fade = 0;
					} else onLedge += 1;
					continue;
				}
			}
			if (flake.rest > 0) {
				// Resting on the floor: slides along it as the phone tilts, then melts away.
				flake.rest -= dt;
				const along = gx * -down.y + gy * down.x;
				flake.x += -down.y * along * 40 * dt;
				flake.y += down.x * along * 40 * dt;
				flake.fade = Math.min(1, flake.rest / 0.9);
				if (flake.rest <= 0) {
					this.placeAtCeiling(flake);
					flake.fade = 0;
				}
				continue;
			}
			const depth = Math.min(1, flake.depth);
			// Gravity, a lazy side-to-side sway, and the swirl's turn around the centre.
			const sway = flake.sway * (0.5 + depth * 0.5);
			let ax =
				gx * FALL * depth + Math.sin(this.time * 0.9 * flake.swayRate + flake.phase) * 9 * sway;
			let ay =
				gy * FALL * depth + Math.cos(this.time * 0.7 * flake.swayRate + flake.phase) * 4 * sway;
			if (tilt < 0.2) {
				// Lying flat: no "down", just a slow drift.
				ax += Math.sin(this.time * 0.3 + flake.phase * 2) * 6;
				ay += Math.cos(this.time * 0.25 + flake.phase) * 6;
			}
			if (spin) {
				const rx = flake.x - cx;
				const ry = flake.y - cy;
				const distance = Math.hypot(rx, ry) || 1;
				const pull = Math.min(1, distance / (Math.min(cx, cy) * 1.4));
				ax += (-ry / distance) * spin * pull - (rx / distance) * spin * 0.12;
				ay += (rx / distance) * spin * pull - (ry / distance) * spin * 0.12;
			}
			flake.vx = (flake.vx + ax * dt) * drag;
			flake.vy = (flake.vy + ay * dt) * drag - kick * flake.depth * 0.35;
			const wasAbove = ledge ? flake.y < ledge.top : false;
			flake.x += flake.vx * dt;
			flake.y += flake.vy * dt;
			if (flake.fade < 1) flake.fade = Math.min(1, flake.fade + dt * 1.5);

			// Landing on the bar from above (near flakes only, and only so many: a rim, not a drift).
			if (
				ledge &&
				wasAbove &&
				flake.y >= ledge.top &&
				flake.x > ledge.left &&
				flake.x < ledge.right &&
				flake.depth >= style.depth &&
				flake.depth <= 1 &&
				this.swirl < 0.3 &&
				onLedge < ledgeRoom &&
				this.sticks(flake, ledge, style)
			) {
				const fullness = onLedge / Math.max(1, ledgeRoom);
				flake.ledge = true;
				flake.order = ++this.ledgeOrder;
				flake.rest = rand(style.rest[0], style.rest[1]);
				// Piling up a touch as it fills, never more than a few pixels. (Clumping snow
				// works out its own height as it stacks: `restack`.)
				flake.lift = style.clump
					? this.heightAt(flake.x, flake.radius, ledge) + flake.radius * 0.6
					: flake.radius * rand(0.35, 0.7) + fullness * rand(0, style.pile);
				flake.y = ledge.top - flake.lift;
				flake.vx = flake.vy = 0;
				onLedge += 1;
				continue;
			}

			// Reaching the floor: settle for a few seconds (the near ones a little lower).
			const beyond = (flake.x - cx) * down.x + (flake.y - cy) * down.y;
			if (tilt >= 0.2 && beyond > floor - 6 * depth && this.swirl < 0.3 && flake.depth <= 1) {
				flake.rest = rand(2.5, 6);
				flake.vx = flake.vy = 0;
				continue;
			}
			// Off any edge (a bokeh flake, a swirl's fling, lying flat): back in from the other side.
			const margin = 24;
			if (flake.x < -margin) flake.x += this.width + margin * 2;
			else if (flake.x > this.width + margin) flake.x -= this.width + margin * 2;
			if (flake.y < -margin) flake.y += this.height + margin * 2;
			else if (flake.y > this.height + margin) flake.y -= this.height + margin * 2;
		}
		this.onLedge = onLedge;
		if (style.clump && this.ledge) this.restack(this.ledge, style.pile, dt);
		this.stepHero(dt, kick, down, floor);
	}

	/**
	 * Clumping snow only: whether a flake landing here stays. Bare bar is slippery, snow is
	 * sticky, so mounds grow where they've started. Where a mound's at full height, it rolls
	 * off to the lower side, a few pixels along, or doesn't stay at all.
	 */
	private sticks(flake: Flake, ledge: { left: number; right: number }, style: LedgeStyleValue) {
		if (!style.clump) return true;
		let here = this.heightAt(flake.x, flake.radius, ledge);
		if (here >= style.pile) {
			const left = this.heightAt(flake.x - 6, flake.radius, ledge);
			const right = this.heightAt(flake.x + 6, flake.radius, ledge);
			const lower = Math.min(left, right);
			if (lower >= style.pile) return false;
			flake.x += left <= right ? -6 : 6;
			here = lower;
		}
		const [bare, onSnow] = style.clump.stick;
		return Math.random() < bare + (onSnow - bare) * Math.min(1, here / 2.5);
	}

	/** The snow's height under a flake: the highest point across its width. */
	private heightAt(x: number, radius: number, ledge: { left: number }) {
		const heights = this.ledgeHeights;
		const from = Math.max(0, Math.floor((x - radius - ledge.left) / 2));
		const to = Math.min(heights.length - 1, Math.ceil((x + radius - ledge.left) / 2));
		let top = 0;
		for (let i = from; i <= to; i += 1) top = Math.max(top, heights[i]);
		return top;
	}

	/**
	 * Stacks the bar's snow in the order it landed, each flake sitting on what's under it, so
	 * a mound sinks as its lower flakes melt or slide away. Each flake leaves a small rounded
	 * hump in the height map, and melting ones shrink, as snow does.
	 */
	private restack(ledge: { left: number; right: number }, pile: number, dt: number) {
		const count = Math.ceil((ledge.right - ledge.left) / 2) + 1;
		if (this.ledgeHeights.length !== count) this.ledgeHeights = new Float32Array(count);
		const heights = this.ledgeHeights;
		heights.fill(0);
		const resting = this.flakes.filter((flake) => flake.ledge).sort((a, b) => a.order - b.order);
		const sink = 1 - Math.exp(-dt * 6);
		for (const flake of resting) {
			const radius = flake.radius * (0.55 + 0.45 * flake.fade);
			const under = this.heightAt(flake.x, radius * 0.8, ledge);
			const lift = Math.min(pile + radius, under + radius * 0.6);
			flake.lift += (lift - flake.lift) * sink;
			const top = flake.lift + radius * 0.55;
			const from = Math.max(0, Math.floor((flake.x - radius * 2.4 - ledge.left) / 2));
			const to = Math.min(count - 1, Math.ceil((flake.x + radius * 2.4 - ledge.left) / 2));
			for (let i = from; i <= to; i += 1) {
				const away = (ledge.left + i * 2 - flake.x) / (radius * 2.4);
				heights[i] = Math.max(heights[i], top * (1 - away * away));
			}
		}
	}

	/** The close-up flake: in now and then, drifting slowly, turning, tumbling, then away. */
	private stepHero(dt: number, kick: number, down: { x: number; y: number }, floor: number) {
		const cx = this.width / 2;
		const cy = this.height / 2;
		let hero = this.hero;
		if (!hero) {
			// Never mid-shake, nor while the snow's fading out.
			if (this.time < this.heroAt || this.swirl > 0.3 || this.stopping) return;
			hero = this.hero = this.newHero();
		}
		hero.age += dt;
		const { x: gx, y: gy } = this.gravity;
		// Heavier and slower than the rest: it's near the glass, so it lingers.
		// Nearer ones cross the screen faster, as close things do.
		const pace = 0.7 + hero.near * 0.9;
		const ax = (gx * FALL * 0.28 + Math.sin(this.time * 0.45 + hero.phase) * 12) * pace;
		const ay = (gy * FALL * 0.28 + Math.cos(this.time * 0.35 + hero.phase) * 5) * pace;
		const drag = Math.exp(-dt * DRAG * 0.9);
		hero.vx = (hero.vx + ax * dt) * drag;
		hero.vy = (hero.vy + ay * dt) * drag - kick * 0.6;
		hero.x += hero.vx * dt;
		hero.y += hero.vy * dt;

		// A slow turn in the screen's plane, settling back after a shake's flick.
		hero.angle += hero.spin * dt;
		const calm = Math.sign(hero.spin || 1) * 0.22;
		hero.spin += (calm - hero.spin) * (1 - Math.exp(-dt * 0.8));
		// Now and then a tumble: half a turn over, eased, like it caught the current.
		if (!hero.tumble && hero.age >= hero.nextTumble) this.startTumble(hero, 1);
		if (hero.tumble) {
			const t = Math.min(1, (this.time - hero.tumble.at) / 1.8);
			const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
			hero.turn = hero.tumble.from + (hero.tumble.to - hero.tumble.from) * eased;
			if (t >= 1) {
				hero.tumble = null;
				hero.nextTumble = hero.age + rand(3.5, 7);
			}
		}

		// Away once it reaches the floor, drifts off an edge, or has been around long enough.
		const beyond = (hero.x - cx) * down.x + (hero.y - cy) * down.y;
		const off =
			hero.x < -hero.size ||
			hero.x > this.width + hero.size ||
			hero.y < -hero.size * 2 ||
			hero.y > this.height + hero.size;
		if (beyond > floor - hero.size * 0.6 || off || hero.age > HERO_LIFE) hero.leaving = true;
		hero.fade = hero.leaving
			? Math.max(0, hero.fade - dt / 1.4)
			: Math.min(1, hero.fade + dt / 1.6);
		if (hero.leaving && hero.fade <= 0) {
			this.hero = null;
			this.heroAt = this.time + rand(HERO_GAP[0], HERO_GAP[1]);
		}
	}

	private newHero(): Hero {
		const { x: gx, y: gy } = this.unitGravity();
		const cx = this.width / 2;
		const cy = this.height / 2;
		const near = Math.random() ** HERO_SKEW;
		const size = HERO_SIZE[0] + (HERO_SIZE[1] - HERO_SIZE[0]) * near;
		const pace = 0.7 + near * 0.9;
		// In from the edge opposite "down", somewhere in the middle stretch of it.
		const reach = Math.abs(gx) * cx + Math.abs(gy) * cy + size * 0.6;
		const across =
			(Math.random() - 0.5) * 0.7 * (Math.abs(gy) * this.width + Math.abs(gx) * this.height);
		return {
			x: cx - gx * reach - gy * across,
			y: cy - gy * reach + gx * across,
			vx: (gx * 14 + rand(-6, 6)) * pace,
			vy: gy * 14 * pace,
			size,
			near,
			angle: Math.random() * Math.PI * 2,
			spin: (Math.random() < 0.5 ? -1 : 1) * rand(0.15, 0.3),
			axis: Math.random() * Math.PI,
			turn: rand(-0.3, 0.3),
			tumble: null,
			nextTumble: rand(2, 4.5),
			age: 0,
			fade: 0,
			shade: 1,
			leaving: false,
			phase: Math.random() * Math.PI * 2
		};
	}

	private startTumble(hero: Hero, halves: number) {
		const from = hero.turn;
		const to = from + (Math.random() < 0.5 ? -1 : 1) * Math.PI * halves;
		hero.tumble = { from, to, at: this.time };
	}

	/** The snowflake icon drawn once per size: soft, a little out of focus, glowing. */
	private heroSprite(size: number) {
		const key = Math.round(size / 4) * 4;
		let sprite = this.heroSprites.get(key);
		if (sprite) return sprite;
		const pad = 0.35;
		const pixels = Math.ceil(key * (1 + pad * 2) * this.ratio);
		sprite = document.createElement('canvas');
		sprite.width = sprite.height = pixels;
		const paint = sprite.getContext('2d')!;
		const scale = (key * this.ratio) / 24;
		const path = new Path2D(HERO_PATH);
		paint.translate(pixels / 2, pixels / 2);
		paint.scale(scale, scale);
		paint.translate(-12, -12);
		paint.lineCap = paint.lineJoin = 'round';
		if (this.options.light) {
			// On a pale backdrop the white needs a cool edge to show at all.
			paint.strokeStyle = 'rgba(116, 136, 166, 0.5)';
			paint.lineWidth = 2.6;
			paint.stroke(path);
		}
		// A wide soft pass for the out-of-focus bloom, then a finer one for its shape.
		paint.shadowColor = 'rgba(255, 255, 255, 0.9)';
		// Big ones are nearer the lens, so further out of focus.
		const focus = 1 + Math.max(0, key - 50) / 45;
		paint.shadowBlur = 5 * scale * focus;
		paint.strokeStyle = 'rgba(255, 255, 255, 0.28)';
		paint.lineWidth = 3.4;
		paint.stroke(path);
		paint.shadowBlur = 1.6 * scale;
		paint.strokeStyle = 'rgba(255, 255, 255, 0.92)';
		paint.lineWidth = 1.35;
		paint.stroke(path);
		this.heroSprites.set(key, sprite);
		return sprite;
	}

	/** Where the cards and fields are on screen right now. */
	private findShelters() {
		this.sheltersStale = false;
		this.shelters = [];
		for (const element of document.querySelectorAll(SHELTERS)) {
			const box = element.getBoundingClientRect();
			if (box.bottom < 0 || box.top > this.height || box.width === 0) continue;
			this.shelters.push({ left: box.left, top: box.top, right: box.right, bottom: box.bottom });
		}
		// The bar's flat top: inset from its rounded ends, where nothing could sit.
		const bar = this.ledgeContext ? document.querySelector(LEDGE)?.getBoundingClientRect() : null;
		const inset = bar ? bar.height * 0.42 : 0;
		this.ledge =
			bar && bar.width > inset * 2 && bar.top > 0 && bar.top < this.height
				? { left: bar.left + inset, right: bar.right - inset, top: bar.top }
				: null;
		const strip = this.options.ledgeCanvas;
		const stripTop = this.ledge ? Math.round(this.ledge.top - STRIP_ABOVE) : -1;
		if (strip && stripTop !== this.stripTop) {
			this.stripTop = stripTop;
			strip.style.transform = `translateY(${stripTop}px)`;
			strip.style.visibility = this.ledge ? 'visible' : 'hidden';
		}
	}

	/** How much shows here: 1 in the open, down to SHELTERED once well inside a card. */
	private shelterAt(x: number, y: number, feather = SHELTER_FEATHER) {
		let inside = 0;
		for (const box of this.shelters) {
			const edge = Math.min(x - box.left, box.right - x, y - box.top, box.bottom - y);
			if (edge > 0) inside = Math.max(inside, Math.min(1, edge / feather));
			if (inside === 1) break;
		}
		// Smoothstep, so it eases off the edge rather than starting at a crease.
		const eased = inside * inside * (3 - 2 * inside);
		return 1 - eased * (1 - SHELTERED);
	}

	/** Eases a flake's shade towards what its spot calls for. */
	private shade(item: { shade: number }, target: number, ease: number) {
		item.shade += (target - item.shade) * ease;
		return item.shade;
	}

	private draw(dt = 1 / 60) {
		const paint = this.context;
		const ease = 1 - Math.exp(-dt * SHADE_EASE);
		if (this.sheltersStale) this.findShelters();
		paint.clearRect(0, 0, this.width, this.height);
		paint.globalAlpha = 1;
		const strip = this.ledgeContext;
		strip?.clearRect(0, 0, this.width, STRIP_ABOVE + STRIP_BELOW);
		if (strip && this.ledge) this.drawDrift(strip);
		for (const flake of this.flakes) {
			if (flake.ledge && strip && this.ledge) {
				// In front of the bar, on its own strip: the bar covers the page canvas here.
				const alpha = flake.alpha * flake.fade * this.opacity;
				if (alpha < 0.01) continue;
				const sprite = this.sprite(flake.radius);
				// Clumping snow shrinks as it melts rather than only fading.
				const melting = LEDGE_STYLES[this.ledgeStyle].clump ? 0.55 + 0.45 * flake.fade : 1;
				const size = (sprite.width / this.ratio) * melting;
				const y = flake.y - this.stripTop;
				strip.globalAlpha = Math.min(1, alpha * 1.15);
				strip.drawImage(sprite, flake.x - size / 2, y - size / 2, size, size);
				continue;
			}
			const shade = this.shade(flake, this.shelterAt(flake.x, flake.y), ease);
			const alpha = flake.alpha * flake.fade * this.opacity * shade;
			if (alpha < 0.01) continue;
			const sprite = this.sprite(flake.radius);
			const size = sprite.width / this.ratio;
			paint.globalAlpha = alpha;
			paint.drawImage(sprite, flake.x - size / 2, flake.y - size / 2, size, size);
		}
		if (strip) strip.globalAlpha = 1;
		paint.globalAlpha = 1;
		this.drawHero(ease);
	}

	/**
	 * The soft bank under the snow on the bar: higher where more flakes are lying, smoothed into
	 * a gentle ridge, and gone where there are none (so it slides and melts with them).
	 */
	private drawDrift(strip: CanvasRenderingContext2D) {
		const style = LEDGE_STYLES[this.ledgeStyle];
		const ledge = this.ledge;
		if (style.clump && ledge) return this.drawClumps(strip, ledge);
		const height = style.drift;
		if (!height || !ledge) return;
		const step = 4;
		const count = Math.ceil((ledge.right - ledge.left) / step) + 1;
		const bins = new Float32Array(count);
		for (const flake of this.flakes) {
			if (!flake.ledge) continue;
			const at = Math.round((flake.x - ledge.left) / step);
			if (at >= 0 && at < count) bins[at] += flake.fade * (0.6 + flake.radius * 0.25);
		}
		// Smooth twice, so it reads as one bank rather than lumps under each flake.
		for (let pass = 0; pass < 2; pass += 1) {
			const copy = bins.slice();
			for (let i = 0; i < count; i += 1)
				bins[i] =
					(copy[i - 2] ?? 0) * 0.1 +
					(copy[i - 1] ?? 0) * 0.2 +
					copy[i] * 0.4 +
					(copy[i + 1] ?? 0) * 0.2 +
					(copy[i + 2] ?? 0) * 0.1;
		}
		const base = ledge.top - this.stripTop + 1;
		strip.beginPath();
		strip.moveTo(ledge.left - step, base);
		for (let i = 0; i < count; i += 1) {
			const lift = Math.min(height, bins[i] * height * 0.9);
			strip.lineTo(ledge.left + i * step, base - lift);
		}
		strip.lineTo(ledge.right + step, base);
		strip.closePath();
		const fill = strip.createLinearGradient(0, base - height, 0, base);
		const rim = this.options.light ? 'rgba(116, 136, 166, 0.35)' : 'rgba(255, 255, 255, 0)';
		fill.addColorStop(0, `rgba(255, 255, 255, ${0.75 * this.opacity})`);
		fill.addColorStop(1, `rgba(255, 255, 255, ${0.35 * this.opacity})`);
		strip.globalAlpha = 1;
		strip.fillStyle = fill;
		strip.shadowColor = this.options.light ? rim : 'rgba(255, 255, 255, 0.5)';
		strip.shadowBlur = 4;
		strip.fill();
		strip.shadowBlur = 0;
	}

	/**
	 * Clumping snow's body: the stacked height map, filled soft white just under the flakes'
	 * tops, so a clump reads as one mound with flakes on its crust rather than a pile of dots.
	 */
	private drawClumps(strip: CanvasRenderingContext2D, ledge: { left: number; top: number }) {
		const heights = this.ledgeHeights;
		if (!heights.length || !heights.some((height) => height > 0.5)) return;
		const base = ledge.top - this.stripTop + 1;
		strip.beginPath();
		strip.moveTo(ledge.left - 2, base);
		for (let i = 0; i < heights.length; i += 1) {
			// Averaged with its neighbours, so the outline is a soft curve, not steps.
			const near = ((heights[i - 1] ?? 0) + heights[i] * 2 + (heights[i + 1] ?? 0)) / 4;
			strip.lineTo(ledge.left + i * 2, base - near * 0.82);
		}
		strip.lineTo(ledge.left + heights.length * 2, base);
		strip.closePath();
		const top = Math.max(...heights);
		const fill = strip.createLinearGradient(0, base - top, 0, base);
		fill.addColorStop(0, `rgba(255, 255, 255, ${0.62 * this.opacity})`);
		fill.addColorStop(1, `rgba(255, 255, 255, ${0.3 * this.opacity})`);
		strip.globalAlpha = 1;
		strip.fillStyle = fill;
		strip.shadowColor = this.options.light
			? 'rgba(116, 136, 166, 0.35)'
			: 'rgba(255, 255, 255, 0.45)';
		strip.shadowBlur = 4;
		strip.fill();
		strip.shadowBlur = 0;
	}

	/**
	 * Turning over in 3D, faked: squash it across its tumbling line by the cosine of the turn
	 * (full face on, a sliver edge on), on top of its turn in the screen's plane. Edge on, it
	 * catches the light for a moment.
	 */
	private drawHero(ease: number) {
		const hero = this.hero;
		if (!hero) return;
		const wobble = Math.sin(this.time * 0.8 + hero.phase) * 0.28;
		const facing = Math.cos(hero.turn + wobble);
		const squash = Math.sign(facing || 1) * Math.max(0.06, Math.abs(facing));
		const glint = Math.max(0, 1 - Math.abs(facing) / 0.3);
		// Small and far off reads crisper; huge and near the lens is a fainter blur.
		const depth = 1.15 - hero.near * 0.5;
		let alpha =
			(this.options.light ? 0.78 : 0.6) * depth * hero.fade * this.opacity * (1 + glint * 0.55);
		// A big flake takes a wider feather, so it slides behind a card as a whole.
		alpha *= this.shade(
			hero,
			this.shelterAt(hero.x, hero.y, SHELTER_FEATHER + hero.size * 0.5),
			ease
		);
		if (alpha < 0.01) return;
		const sprite = this.heroSprite(hero.size);
		const size = sprite.width / this.ratio;
		const paint = this.context;
		paint.save();
		paint.globalAlpha = Math.min(1, alpha);
		paint.translate(hero.x, hero.y);
		paint.rotate(hero.angle + hero.axis);
		paint.scale(squash, 1);
		paint.rotate(-hero.axis);
		paint.drawImage(sprite, -size / 2, -size / 2, size, size);
		paint.restore();
	}
}

/**
 * Asks iOS for motion access, which it only grants from a tap. Elsewhere there's nothing to
 * ask. Remembers the answer on this phone, so the snow knows whether tilting can work.
 */
export async function askForMotion(): Promise<'granted' | 'denied' | 'unneeded'> {
	type Askable = { requestPermission?: () => Promise<'granted' | 'denied'> };
	const motion = (globalThis as { DeviceMotionEvent?: Askable }).DeviceMotionEvent;
	const orientation = (globalThis as { DeviceOrientationEvent?: Askable }).DeviceOrientationEvent;
	if (typeof motion?.requestPermission !== 'function') return 'unneeded';
	try {
		const answer = await motion.requestPermission();
		if (typeof orientation?.requestPermission === 'function')
			await orientation.requestPermission().catch(() => 'denied');
		rememberMotion(answer);
		return answer === 'granted' ? 'granted' : 'denied';
	} catch {
		rememberMotion('denied');
		return 'denied';
	}
}

const MOTION_KEY = 'hb-motion';

function rememberMotion(answer: string) {
	try {
		localStorage.setItem(MOTION_KEY, answer);
	} catch {
		// Private browsing: asked again next time.
	}
}

export function motionAnswer(): 'granted' | 'denied' | null {
	try {
		const answer = localStorage.getItem(MOTION_KEY);
		return answer === 'granted' || answer === 'denied' ? answer : null;
	} catch {
		return null;
	}
}

/** Whether this phone has to be asked (iOS) before motion works. */
export const motionNeedsAsking = () =>
	typeof (globalThis as { DeviceMotionEvent?: { requestPermission?: unknown } }).DeviceMotionEvent
		?.requestPermission === 'function';
