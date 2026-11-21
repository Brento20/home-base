/**
 * The colours a person can wear: their avatar, their ring on tasks and lists, their dot on the
 * points board. Picked on Edit your profile. The first six are the ones a new member is given
 * automatically (public.pick_accent_colour), in that order. All read well on dark and, deepened
 * as rings (--ring-ink), on light.
 */
export const AVATAR_COLOURS = [
	{ hex: '#e58440', name: 'Tangerine' },
	{ hex: '#d6dce2', name: 'Silver' },
	{ hex: '#8fb7a5', name: 'Sage' },
	{ hex: '#c79ad6', name: 'Lilac' },
	{ hex: '#e0c36a', name: 'Mustard' },
	{ hex: '#7fa7d9', name: 'Sky' },
	{ hex: '#e88a9e', name: 'Rose' },
	{ hex: '#6fc3c9', name: 'Lagoon' },
	{ hex: '#a9c46c', name: 'Lime' },
	{ hex: '#d4a585', name: 'Clay' }
] as const;

export const isAvatarColour = (value: string) =>
	AVATAR_COLOURS.some((colour) => colour.hex === value.toLowerCase());
