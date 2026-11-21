/**
 * Friends: people you know in other homes. You add someone by sending them a friend link
 * (good for one person and two weeks); they open /friend/[token] and you're friends. Friends see
 * each other's name, colour, photo and home's name, and can send each other postcards, which land
 * in the other's home feed. Nothing else of either home is shared
 * (20261125000000_friends_postcards_sitters.sql).
 */

export const FRIEND_LINK_DAYS = 14;
export const POSTCARD_MAX = 500;

export const friendLink = (origin: string, token: string) => `${origin}/friend/${token}`;
