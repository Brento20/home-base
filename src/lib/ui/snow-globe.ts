/**
 * The December snow globe: a canvas of small flakes behind the page that fall with the phone's
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
 * Kind to the battery: full frame rate only while the snow is lively, about 30 frames a
 * second when it's calm, and nothing at all while the app is in the background.
 */

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
	/** Seconds left resting on the floor; 0 while it's moving. */
	rest: number;
	/** Fades in after a respawn, out at the end of a rest. */
	fade: number;
}

export interface SnowGlobeOptions {
	/** Light mode gives each white flake a faint cool rim, so it shows on the pale backdrop. */
	light: boolean;
	/** Told once, when the first motion reading arrives (tilting works). */
	onSensed?: () => void;
}

/**
 * Cards and fields are see-through glass, so snow behind them would cross their text. Inside
 * these, a flake shows as a faint ghost: still behind the glass, never in the way of reading.
 */
const SHELTERS =
	'.glass-slot, .grouped, .roster, .nudge, .status, .field-input, .segmented, .choice-pill, .tab-bar';
/** How much of a flake shows behind a card. */
const SHELTERED = 0.16;

/** Pixels per second squared for a near flake falling straight down. */
const FALL = 130;
/** How quickly the liquid slows a flake (per second); lower while swirling. */
const DRAG = 1.7;
const SWIRL_DRAG = 0.85;
/** A spike past this (m/s², gravity removed) is a shake. */
const SHAKE_AT = 9;
const MAX_DT = 1 / 20;

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
	private cleanups: (() => void)[] = [];

	constructor(
		private canvas: HTMLCanvasElement,
		private options: SnowGlobeOptions
	) {
		this.context = canvas.getContext('2d', { alpha: true })!;
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
				resolve();
			};
		});
	}

	setLight(light: boolean) {
		this.options.light = light;
		this.sprites.clear();
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
		}
	}

	private resize() {
		// Soft, blurry flakes look the same at standard resolution, at a quarter of the pixels a
		// retina canvas would draw every frame.
		this.ratio = 1;
		this.width = window.innerWidth;
		this.height = window.innerHeight;
		this.canvas.width = Math.round(this.width * this.ratio);
		this.canvas.height = Math.round(this.height * this.ratio);
		this.context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
		const want = Math.round(Math.min(220, Math.max(70, (this.width * this.height) / 2600)));
		while (this.flakes.length < want) this.flakes.push(this.newFlake(true));
		this.flakes.length = Math.min(this.flakes.length, want);
	}

	private seed() {
		this.flakes = this.flakes.map(() => this.newFlake(true));
	}

	private newFlake(anywhere: boolean): Flake {
		// About one in twenty is a big, soft, out-of-focus flake close to the glass.
		const bokeh = Math.random() < 0.05;
		const depth = bokeh ? rand(1.15, 1.35) : rand(0.35, 1) ** 1.4 * 0.65 + 0.35;
		const flake: Flake = {
			x: 0,
			y: 0,
			vx: rand(-8, 8),
			vy: rand(0, 20) * depth,
			depth,
			radius: bokeh ? rand(4.5, 7) : 1 + depth * 2.3,
			alpha: bokeh ? rand(0.09, 0.16) : 0.3 + depth * 0.6,
			phase: Math.random() * Math.PI * 2,
			rest: 0,
			fade: anywhere ? 1 : 0
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
		this.target = { x, y };

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
		for (const flake of this.flakes) flake.vy -= delta * flake.depth * 0.35;
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
			// Calm snow draws at about 30 frames a second; a swirl, a tilt or a fade at full rate.
			this.sinceDraw += dt;
			const lively =
				this.swirl > 0.05 ||
				this.opacity < 1 ||
				this.stopping !== null ||
				Math.hypot(this.target.x - this.gravity.x, this.target.y - this.gravity.y) > 0.02;
			if (lively || this.sinceDraw >= 1 / 31) {
				this.draw();
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
		const ease = 1 - Math.exp(-dt * 7);
		this.gravity.x += (this.target.x - this.gravity.x) * ease;
		this.gravity.y += (this.target.y - this.gravity.y) * ease;
		this.swirl *= Math.exp(-dt / 1.6);

		const { x: gx, y: gy } = this.gravity;
		const tilt = Math.hypot(gx, gy);
		const down = this.unitGravity();
		const cx = this.width / 2;
		const cy = this.height / 2;
		// How far "down" the floor is from the centre, along the direction of gravity.
		const floor = Math.abs(down.x) * cx + Math.abs(down.y) * cy;
		const drag = Math.exp(-dt * (DRAG + (SWIRL_DRAG - DRAG) * Math.min(1, this.swirl)));
		const spin = this.swirl * 180 * this.swirlTurn;

		for (const flake of this.flakes) {
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
			let ax = gx * FALL * depth + Math.sin(this.time * 0.9 + flake.phase) * 9;
			let ay = gy * FALL * depth + Math.cos(this.time * 0.7 + flake.phase) * 4;
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
			flake.vy = (flake.vy + ay * dt) * drag;
			flake.x += flake.vx * dt;
			flake.y += flake.vy * dt;
			if (flake.fade < 1) flake.fade = Math.min(1, flake.fade + dt * 1.5);

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
	}

	private sheltered(x: number, y: number) {
		for (const box of this.shelters)
			if (x > box.left && x < box.right && y > box.top && y < box.bottom) return true;
		return false;
	}

	private draw() {
		const paint = this.context;
		if (this.sheltersStale) this.findShelters();
		paint.clearRect(0, 0, this.width, this.height);
		paint.globalAlpha = 1;
		for (const flake of this.flakes) {
			const alpha =
				flake.alpha *
				flake.fade *
				this.opacity *
				(this.sheltered(flake.x, flake.y) ? SHELTERED : 1);
			if (alpha < 0.01) continue;
			const sprite = this.sprite(flake.radius);
			const size = sprite.width / this.ratio;
			paint.globalAlpha = alpha;
			paint.drawImage(sprite, flake.x - size / 2, flake.y - size / 2, size, size);
		}
		paint.globalAlpha = 1;
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
