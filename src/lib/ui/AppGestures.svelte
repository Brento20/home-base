<script lang="ts">
	/**
	 * App-style gestures for the main app (src/lib/ui/gestures.ts says what each one means):
	 * swipe between tabs, swipe right to go back, pull down to refresh.
	 *
	 * The page follows your finger with some resistance and a glass hint appears at the edge
	 * (or the top) showing where you'll go. Let go far enough, or flick, and it happens;
	 * otherwise everything springs back. Touches that start on a text field, a horizontal
	 * scroller (except at the screen's edge) or anything marked `data-gesture-ignore` are
	 * left alone. All listeners are passive, so scrolling is never held up.
	 */
	import { onMount } from 'svelte';
	import { afterNavigate, goto, refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import { GESTURE, rubber, swipeAction, type SwipeAction } from './gestures.js';

	let swipe = $state<{
		action: SwipeAction | null;
		progress: number;
		side: 'left' | 'right';
	} | null>(null);
	let pull = $state(0);
	let refresh = $state<'idle' | 'pulling' | 'refreshing' | 'done'>('idle');

	// How many steps back we can go inside the app, for "back" (vs. leaving the app).
	let depth = 0;
	afterNavigate((navigation) => {
		if (navigation.type === 'enter') depth = 0;
		else if (navigation.type === 'popstate') depth = Math.max(0, depth + (navigation.delta ?? -1));
		else if (navigation.from?.url.pathname !== navigation.to?.url.pathname) depth += 1;
	});

	const ignore =
		'input, textarea, select, [contenteditable], [data-gesture-ignore], [role="menu"], dialog';

	/** Whether something between the touch and the page scrolls sideways (a carousel). */
	function inSideScroller(element: Element | null) {
		for (let node = element; node && node !== document.body; node = node.parentElement) {
			const style = getComputedStyle(node);
			if (/(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1)
				return true;
		}
		return false;
	}

	onMount(() => {
		const screen = document.querySelector<HTMLElement>('main.screen');
		if (!screen) return;
		const reduced = matchMedia('(prefers-reduced-motion: reduce)');

		let start: { x: number; y: number; t: number; canSwipe: boolean; canPull: boolean } | null =
			null;
		let mode: 'none' | 'swipe' | 'pull' | 'other' = 'none';
		let dx = 0;
		let frame = 0;

		/** Moves the page with the gesture (or puts it back, with a spring, when `settle`). */
		function place(x: number, y: number, settle = false) {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				screen!.style.transition = settle
					? 'translate var(--duration-release) var(--spring-soft)'
					: 'none';
				screen!.style.translate = x || y ? `${x}px ${y}px` : '';
			});
		}

		function onStart(event: TouchEvent) {
			if (event.touches.length !== 1 || refresh === 'refreshing') return;
			const touch = event.touches[0];
			const target = event.target as Element;
			const blocked = !!target.closest?.(ignore);
			const atEdge = touch.clientX < GESTURE.edge || touch.clientX > innerWidth - GESTURE.edge;
			start = {
				x: touch.clientX,
				y: touch.clientY,
				t: event.timeStamp,
				canSwipe: !blocked && (atEdge || !inSideScroller(target)),
				canPull: !blocked && (document.scrollingElement?.scrollTop ?? 0) <= 0
			};
			mode = 'none';
		}

		function onMove(event: TouchEvent) {
			if (!start || event.touches.length !== 1) return;
			const touch = event.touches[0];
			dx = touch.clientX - start.x;
			const dy = touch.clientY - start.y;

			if (mode === 'none') {
				if (Math.abs(dx) < GESTURE.axisLock && Math.abs(dy) < GESTURE.axisLock) return;
				if (start.canSwipe && Math.abs(dx) > Math.abs(dy) * 1.2) mode = 'swipe';
				else if (start.canPull && dy > 0 && dy > Math.abs(dx)) mode = 'pull';
				else mode = 'other';
			}

			if (mode === 'swipe') {
				const action = swipeAction(page.url.pathname, dx);
				const travel = action ? GESTURE.swipeTravel : 12;
				swipe = {
					action,
					progress: Math.min(1, Math.abs(dx) / GESTURE.swipeCommit),
					side: dx > 0 ? 'left' : 'right'
				};
				if (!reduced.matches) place(Math.sign(dx) * rubber(dx, travel), 0);
			} else if (mode === 'pull') {
				pull = rubber(Math.max(0, dy), GESTURE.pullMax);
				refresh = 'pulling';
				// The page drops a little further than the bead, so the bead never covers the heading.
				if (!reduced.matches) place(0, pull * 0.9);
			}
		}

		async function onEnd(event: TouchEvent) {
			if (!start) return;
			const elapsed = Math.max(1, event.timeStamp - start.t);
			const wasMode = mode;
			start = null;
			mode = 'none';

			if (wasMode === 'swipe') {
				const action = swipe?.action ?? null;
				const far = Math.abs(dx) > GESTURE.swipeCommit;
				const flick =
					Math.abs(dx) > GESTURE.flickDistance && Math.abs(dx) / elapsed > GESTURE.flickSpeed;
				swipe = null;
				if (action && (far || flick)) {
					// The page stays where the finger let go and the page transition carries it on
					// from there (page-transitions.ts clears this offset as the new page comes in).
					cancelAnimationFrame(frame);
					screen!.style.transition = 'none';
					if (action.kind === 'tab') await goto(action.href);
					else if (depth > 0) history.back();
					else await goto(action.fallback, { replace: true });
				} else {
					place(0, 0, true);
				}
			} else if (wasMode === 'pull') {
				if (pull >= GESTURE.pullArm) {
					refresh = 'refreshing';
					pull = GESTURE.pullArm;
					if (!reduced.matches) place(0, pull * 0.9, true);
					// Long enough to see it happen, however quick the network is.
					await Promise.all([refreshAll(), new Promise((done) => setTimeout(done, 700))]);
					refresh = 'done';
					await new Promise((done) => setTimeout(done, 450));
				}
				refresh = 'idle';
				pull = 0;
				place(0, 0, true);
			}
		}

		const options = { passive: true } as const;
		addEventListener('touchstart', onStart, options);
		addEventListener('touchmove', onMove, options);
		addEventListener('touchend', onEnd, options);
		addEventListener('touchcancel', onEnd, options);
		return () => {
			removeEventListener('touchstart', onStart);
			removeEventListener('touchmove', onMove);
			removeEventListener('touchend', onEnd);
			removeEventListener('touchcancel', onEnd);
			cancelAnimationFrame(frame);
		};
	});

	const armed = $derived(pull >= GESTURE.pullArm);
</script>

<!-- Pull to refresh: a glass bead drops from the top, its arrow winding up as you pull. -->
<div
	class="pull"
	class:active={refresh !== 'idle'}
	class:armed
	class:refreshing={refresh === 'refreshing'}
	class:done={refresh === 'done'}
	style:--pull="{pull}px"
	style:--turn="{pull * 3.2}deg"
	aria-hidden="true"
>
	<span class="bead">
		<span class="glyph"><Icon name={refresh === 'done' ? 'check' : 'refresh'} size={20} /></span>
	</span>
</div>
<span class="visually-hidden" aria-live="polite">
	{refresh === 'refreshing' ? 'Refreshing' : refresh === 'done' ? 'Up to date' : ''}
</span>

<!-- Swipe hint: where letting go will take you, growing as you get there. -->
{#if swipe?.action}
	<div
		class="edge-hint {swipe.side}"
		class:ready={swipe.progress >= 1}
		style:--progress={swipe.progress}
		aria-hidden="true"
	>
		<span class="bead">
			<Icon name={swipe.side === 'left' ? 'back' : 'chevron'} size={20} />
		</span>
		<span class="hint-label">
			{swipe.action.kind === 'tab' ? swipe.action.label : 'Back'}
		</span>
	</div>
{/if}

<style>
	.bead {
		position: relative;
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--glass-body);
		-webkit-backdrop-filter: var(--glass-blur);
		backdrop-filter: var(--glass-blur);
		box-shadow: var(--glass-inner-light), var(--shadow-lift);
		color: var(--colour-text);
	}

	/* The same specular rim as the cards. */
	.bead::after {
		content: '';
		position: absolute;
		inset: 0;
		padding: var(--glass-rim-width);
		border-radius: inherit;
		background: var(--glass-rim);
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
	}

	/* Pull to refresh ----------------------------------------------------------------------- */

	.pull {
		position: fixed;
		top: calc(env(safe-area-inset-top) - 44px);
		left: 50%;
		z-index: 40;
		opacity: 0;
		transform: translate(-50%, var(--pull)) scale(calc(0.6 + min(var(--pull) / 64px, 1) * 0.4));
		transition:
			transform var(--duration-release) var(--spring-soft),
			opacity 200ms var(--ease-out);
		pointer-events: none;
	}

	.pull.active {
		opacity: 1;
	}

	/* While the finger is down the bead tracks it exactly. */
	.pull.active:not(.refreshing):not(.done) {
		transition: opacity 120ms var(--ease-out);
	}

	.glyph {
		display: grid;
		transform: rotate(var(--turn));
		color: var(--colour-text-muted);
		transition: color var(--duration-quick) var(--ease-out);
	}

	.armed .glyph,
	.done .glyph {
		color: #f6b37a;
	}

	.refreshing .glyph {
		animation: spin 760ms linear infinite;
	}

	.done .bead {
		animation: pop 320ms var(--spring-bouncy);
	}

	@keyframes spin {
		to {
			transform: rotate(calc(var(--turn) + 360deg));
		}
	}

	@keyframes pop {
		50% {
			transform: scale(1.12);
		}
	}

	/* Swipe hint ---------------------------------------------------------------------------- */

	.edge-hint {
		position: fixed;
		top: 42%;
		z-index: 40;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		opacity: calc(var(--progress) * 1.2);
		pointer-events: none;
		transition: scale 180ms var(--spring-bouncy);
	}

	.edge-hint.left {
		left: 10px;
		translate: calc((var(--progress) - 1) * 28px) 0;
	}

	.edge-hint.right {
		right: 10px;
		translate: calc((1 - var(--progress)) * 28px) 0;
	}

	.edge-hint.ready {
		scale: 1.08;
	}

	.ready .bead {
		color: #f6b37a;
	}

	.hint-label {
		font-size: var(--text-caption);
		font-weight: var(--weight-medium);
		color: var(--colour-text-muted);
		text-shadow: 0 1px 8px rgb(0 0 0 / 0.6);
	}

	@media (prefers-reduced-motion: reduce) {
		.refreshing .glyph {
			animation: none;
			opacity: 0.6;
		}

		.done .bead {
			animation: none;
		}
	}
</style>
