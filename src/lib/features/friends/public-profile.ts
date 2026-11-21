/**
 * Your public profile: what anyone signed in to home base can see, friends or not (someone
 * opening your friend link, a guest from another home on a plan you share). Your name, colour,
 * pronouns, the line about you, and these five short answers, all optional. Your photo stays with
 * your home and your friends (20261125000400_public_profiles.sql).
 */

export const PUBLIC_FIELD_MAX = 60;
export const BIO_MAX = 140;

export const PUBLIC_FIELDS = [
	{ key: 'suburb', column: 'suburb', label: 'Neighbourhood', placeholder: 'Marrickville' },
	{ key: 'knownFor', column: 'known_for', label: 'Known for', placeholder: 'My lasagne' },
	{
		key: 'happyTo',
		column: 'happy_to',
		label: 'Happy to help with',
		placeholder: 'Watering plants, lending a ladder'
	},
	{
		key: 'localSpot',
		column: 'local_spot',
		label: 'Favourite local spot',
		placeholder: 'The bakery on King St'
	},
	{
		key: 'askMeAbout',
		column: 'ask_me_about',
		label: 'Ask me about',
		placeholder: 'Sourdough, cycling, Bluey'
	}
] as const;

export type PublicFieldKey = (typeof PUBLIC_FIELDS)[number]['key'];
export type PublicFields = Record<PublicFieldKey, string>;

export const emptyPublicFields = (): PublicFields => ({
	suburb: '',
	knownFor: '',
	happyTo: '',
	localSpot: '',
	askMeAbout: ''
});

/** The fields someone filled in, in order, for showing. */
export const filledFields = (fields: PublicFields) =>
	PUBLIC_FIELDS.filter((field) => fields[field.key]).map((field) => ({
		label: field.label,
		value: fields[field.key]
	}));
