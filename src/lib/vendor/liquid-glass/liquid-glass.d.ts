// Minimal types for the vendored liquidglass.dev engine.
export interface GlassOptions {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	radius?: number;
	refraction?: number;
	bezel?: number;
	curvature?: number;
	ior?: number;
	invert?: boolean;
	chroma?: number;
	blur?: number;
	specular?: number;
	specularWidth?: number;
	lightAngle?: number;
	mapScale?: number;
	fit?: boolean;
	clip?: boolean;
	mode?: 'content' | 'backdrop';
	fallback?: string;
	sync?: boolean;
	hidden?: boolean;
}

export interface GlassController {
	update(options: GlassOptions): void;
	destroy(): void;
}

export function createGlass(target: HTMLElement, options?: GlassOptions): GlassController;
export function createSpring(
	initial: number,
	onUpdate: (value: number, velocity: number) => void,
	options?: { stiffness?: number; damping?: number; mass?: number }
): { set(target: number, options?: { immediate?: boolean }): void };
export const engine: 'blink' | 'webkit' | 'gecko' | 'unknown';
export const reducedMotion: { matches: boolean };
export const DEFAULTS: Readonly<
	Required<Omit<GlassOptions, 'fit' | 'clip' | 'mode' | 'fallback' | 'sync' | 'hidden'>>
>;
