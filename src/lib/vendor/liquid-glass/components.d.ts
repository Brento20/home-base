// Minimal types for the vendored liquidglass.dev web components module.
export * from './liquid-glass.js';
export function toast(
	message: string,
	options?: {
		icon?: string | null;
		duration?: number;
		container?: HTMLElement;
		tone?: string;
		backdrop?: string;
	}
): { close(): void; element: HTMLElement };
