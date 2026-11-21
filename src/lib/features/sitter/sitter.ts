/**
 * House-sitter links: a single page for someone looking after the home, at /sitter/[token]. The
 * home picks a message, which notes to show (secret ones too, if chosen) and whether to list the
 * chores until it ends. No account, nothing else of the home, never money. It ends at the end of
 * its last day, or the moment someone in the home stops it
 * (20261125000000_friends_postcards_sitters.sql).
 */

/** The furthest away a link's last day can be. */
export const SITTER_MAX_DAYS = 60;
export const SITTER_LABEL_MAX = 40;
export const SITTER_MESSAGE_MAX = 1000;

export const sitterLink = (origin: string, token: string) => `${origin}/sitter/${token}`;
