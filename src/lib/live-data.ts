/**
 * What the live-refresh timer reloads (src/lib/ui/live-refresh.ts). A screen worth keeping
 * current while it's open (Today) calls `depends(LIVE_DATA)` in its load; on any other screen
 * the timer fetches nothing, and it never reruns the shared layout.
 */
export const LIVE_DATA = 'app:live';
