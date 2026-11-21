import type { FeedPost, FeedReaction, Profile } from '#lib/types.js';

/** The reactions a post can get, in the order they're offered. Shared by the browser and server. */
export const REACTIONS: { key: FeedReaction; emoji: string; label: string }[] = [
	{ key: 'heart', emoji: '❤️', label: 'Love' },
	{ key: 'thumbs_up', emoji: '👍', label: 'Sounds good' },
	{ key: 'laugh', emoji: '😂', label: 'Haha' },
	{ key: 'thanks', emoji: '🙏', label: 'Thanks' }
];

export const isReaction = (value: string): value is FeedReaction =>
	REACTIONS.some((reaction) => reaction.key === value);

/**
 * Each reaction with how many people gave it, whether you did, and their names for the
 * accessible label ("Love: Chris and you").
 */
export function summariseReactions(post: FeedPost, people: Profile[], me: string) {
	// Postcard reactions carry the giver's name: they may live in another home.
	const nameOf = (entry: FeedPost['reactions'][number]) =>
		entry.profileId === me
			? 'you'
			: (people.find((person) => person.id === entry.profileId)?.displayName ??
				entry.name ??
				'Someone');

	return REACTIONS.map((reaction) => {
		const givers = post.reactions.filter((entry) => entry.reaction === reaction.key);
		const names = givers.map(nameOf);
		return {
			...reaction,
			count: givers.length,
			mine: givers.some((entry) => entry.profileId === me),
			who:
				names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : (names[0] ?? '')
		};
	});
}
