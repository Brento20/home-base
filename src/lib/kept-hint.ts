/**
 * The cookie the phone uses to tell the server which tabs it already has a copy of, so the
 * server streams those straight away rather than waiting (src/lib/server/soon.ts). A session
 * cookie, reset whenever the app starts, since the copies only live in memory.
 */
export const KEPT_COOKIE = 'hb_kept';
