/**
 * The faint line drawing on a plan's card and page, picked from what the plan is: a present for
 * a birthday, a controller for a games night, a boat for a day on the water. Words in the title
 * count first, then the notes. No match, no drawing: a plain card beats a wrong one.
 *
 * Every drawing is original and generic, never a brand, character or logo.
 */

export type Motif =
	| 'gift'
	| 'bauble'
	| 'rings'
	| 'trophy'
	| 'controller'
	| 'boat'
	| 'plane'
	| 'tent'
	| 'music'
	| 'ticket'
	| 'cocktail'
	| 'dinner'
	| 'coffee'
	| 'heart'
	| 'paw'
	| 'house';

/** In order: the first that matches wins, so "Xmas canapés" is a bauble, not dinner. */
const RULES: [Motif, RegExp][] = [
	['bauble', /\b(x-?mas|christmas|chrissy|santa|carols?)\b/],
	['rings', /\b(wedding|engagement|engaged|hens?|bucks?)\b/],
	// A birthday, or an age like "70th" or "21st" (13 and up, so a date like "5th" doesn't count).
	[
		'gift',
		/\b(birthday|bday|b-day|party|parties|anniversary|baby shower|presents?|(1[3-9]|[2-9]\d|1\d\d)(st|nd|rd|th))\b/
	],
	// Sport before games: "Rangers vs Convicts game" is a match.
	[
		'trophy',
		/\b(vs\.?|versus|match|footy|football|soccer|rugby|league|cricket|netball|basketball|tennis|golf|grand final|derby|race day|marathon|fun run|parkrun)\b/
	],
	[
		'controller',
		/\b(gaming|video ?games?|games? night|lan|level \d+|xp|nintendo|switch|playstation|ps5|xbox|steam|minecraft|pok[eé]mon|mario|zelda|console|board ?games?|d&d|dnd)\b/
	],
	[
		'boat',
		/\b(boat|boating|canoe|canoeing|kayak|kayaking|sail|sailing|marina|ferry|cruise|beach|swim|swimming|surf|surfing|snorkel|fishing)\b/
	],
	[
		'plane',
		/\b(flight|fly|flying|airport|holiday|holidays|trip|travel|getaway|overseas|vacation)\b/
	],
	// Before the outdoors: "Walk the dog" is about the dog.
	['paw', /\b(vet|dog|dogs|puppy|cat|kitten|pet|pets|groomer)\b/],
	['tent', /\b(camp|camping|hike|hiking|bushwalk|walk|trek|glamping|national park|mountains?)\b/],
	['music', /\b(concert|gig|festival|band|music|choir|dj|opera|orchestra|karaoke)\b/],
	['ticket', /\b(movie|movies|cinema|film|theatre|theater|musical|show|comedy|play)\b/],
	['cocktail', /\b(drinks?|cocktails?|bar|pub|wine|beers?|happy hour|bottomless|tasting)\b/],
	[
		'dinner',
		/\b(dinner|lunch|brunch|breakfast|restaurant|feast|bbq|barbecue|picnic|canap[eé]s|yum cha|degustation|eat|food)\b/
	],
	['coffee', /\b(coffee|cafe|café|catch ?up|morning tea|high tea)\b/],
	['heart', /\b(date|date night|valentines?)\b/],
	[
		'house',
		/\b(housewarming|house ?warming|inspection|open home|moving|move|settlement|tradie|plumber|electrician)\b/
	]
];

function match(text: string): Motif | null {
	const words = text.toLowerCase();
	for (const [motif, pattern] of RULES) if (pattern.test(words)) return motif;
	return null;
}

export function planMotif(plan: { title: string; notes?: string | null }): Motif | null {
	return match(plan.title) ?? (plan.notes ? match(plan.notes) : null);
}
