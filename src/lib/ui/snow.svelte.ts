/**
 * The snow globe's shared switches: a short preview (turning it on outside December shows a
 * few seconds of snow, so you can see what you've chosen), and a Shake button for phones and
 * laptops without a motion sensor. The running globe registers itself here.
 */
import { todayISO } from '#lib/time.js';
import type { SnowGlobe } from './snow-globe.js';

let previewing = $state(false);
let timer: ReturnType<typeof setTimeout> | undefined;
let globe: SnowGlobe | null = null;
/** A motion reading has arrived on this phone, so tilting works (whatever the permission said). */
let sensed = $state(false);

export const motionSensed = () => sensed;
export function markSensed() {
	sensed = true;
}

/** It only snows in December (in the home's time zone). */
export const isDecember = () => todayISO().slice(5, 7) === '12';

export const isPreviewing = () => previewing;

export function previewSnow(ms = 9000) {
	previewing = true;
	clearTimeout(timer);
	timer = setTimeout(() => (previewing = false), ms);
}

export function endPreview() {
	clearTimeout(timer);
	previewing = false;
}

export function setGlobe(next: SnowGlobe | null) {
	globe = next;
}

/** Shakes the snow, if it's falling. */
export function shakeSnow() {
	globe?.shake(1);
}
