/**
 * What each icon means. The SVGs (glyphs.ts, generated from tools/icons) are only pictures; this
 * says what they represent, so meaning.ts can pick the right one for a task or plan from what it
 * says, not from the first word that happens to match.
 *
 * For each icon that can stand for a task or plan:
 * - `entities`: named things that are certainly it: titles, brands, platforms, set phrases
 *   ("mario kart", "secret santa"). The strongest evidence.
 * - `subjects`: the things it's a picture of, nouns ("dog", "bins", "flight"). Strong.
 * - `verbs`: what you do that it shows ("pick up" for groceries). They count most beside a
 *   subject of the same icon, and carry it alone only when nothing else in the sentence points
 *   elsewhere ("Clean").
 * - `actions`: verbs so particular to the icon that they outweigh the thing they're done to:
 *   "Vacuum the lounge" is vacuuming, not a sofa; "Ring the plumber" is a call.
 * - `contexts`: words around it that lean its way ("at the pub", "for the trip"). Weak.
 * - `kinds`: what it's usually on: plans, chores or dinners. A nudge, not a rule.
 *
 * Words are written in their plain form; meaning.ts reduces both these and the text to stems, so
 * "dog" also matches "dogs" and "walking" matches "walk". Phrases match as whole words in order.
 * Icons that only make sense as buttons (chevrons, close, filters) have no meaning and are never
 * chosen.
 */
import type { GlyphId } from './glyphs.js';

export type IconKind = 'plan' | 'chore' | 'dinner';

export type IconCategory =
	| 'social'
	| 'planning'
	| 'household'
	| 'food'
	| 'money'
	| 'travel'
	| 'games'
	| 'entertainment'
	| 'seasonal'
	| 'wellbeing';

export interface IconMeaning {
	id: GlyphId;
	category: IconCategory;
	entities?: string[];
	subjects?: string[];
	verbs?: string[];
	actions?: string[];
	contexts?: string[];
	kinds?: IconKind[];
	/** Whole-text patterns that mean it outright, like an age for a birthday ("70th"). */
	patterns?: RegExp[];
}

/** In order of preference: when two fit equally well, the earlier one wins. */
export const MEANINGS: IconMeaning[] = [
	// Games: the platform follows the game. Titles are entities, so "Play Mario Kart" is a
	// Nintendo game before it's anything with a cart in it.
	{
		id: 'pokeball',
		category: 'games',
		entities: [
			'pokemon',
			'pokemon go',
			'pokemon card',
			'pikachu',
			'poke ball',
			'pokeball',
			'pokedex',
			'scarlet and violet',
			'legends arceus'
		],
		kinds: ['plan', 'chore']
	},
	{
		id: 'switch-controller',
		category: 'games',
		entities: [
			'nintendo',
			'nintendo switch',
			'switch 2',
			'joycon',
			'joy con',
			'mario',
			'mario kart',
			'mario party',
			'super mario',
			'luigi',
			'zelda',
			'breath of the wild',
			'tears of the kingdom',
			'animal crossing',
			'splatoon',
			'smash bros',
			'super smash',
			'kirby',
			'donkey kong',
			'metroid',
			'pikmin',
			'fire emblem',
			'xenoblade',
			'yoshi',
			'just dance'
		],
		subjects: ['switch'],
		kinds: ['plan', 'chore']
	},
	{
		id: 'gamepad',
		category: 'games',
		entities: [
			'playstation',
			'ps5',
			'ps4',
			'xbox',
			'gta',
			'gta 6',
			'gta vi',
			'grand theft auto',
			'call of duty',
			'warzone',
			'fortnite',
			'fifa',
			'ea fc',
			'god of war',
			'spider man',
			'spiderman',
			'last of us',
			'elden ring',
			'uncharted',
			'red dead',
			'cyberpunk',
			'apex legends',
			'rocket league',
			'minecraft',
			'roblox',
			'halo',
			'gran turismo',
			'assassins creed',
			'resident evil',
			'baldurs gate',
			'steam deck'
		],
		subjects: ['video game', 'gaming', 'console', 'controller', 'gamer', 'lan party', 'esport'],
		verbs: ['game'],
		kinds: ['plan', 'chore']
	},
	{
		id: 'dice',
		category: 'games',
		entities: [
			'board game',
			'boardgame',
			'game night',
			'games night',
			'monopoly',
			'catan',
			'scrabble',
			'cluedo',
			'yahtzee',
			'ticket to ride',
			'dungeons and dragons',
			'd&d',
			'dnd',
			'trivia night',
			'quiz night'
		],
		subjects: ['dice', 'trivia', 'quiz'],
		kinds: ['plan']
	},
	{
		id: 'playing-cards',
		category: 'games',
		entities: [
			'uno',
			'poker',
			'blackjack',
			'solitaire',
			'canasta',
			'magic the gathering',
			'card game'
		],
		subjects: ['cards', 'deck of cards'],
		kinds: ['plan']
	},
	{
		id: 'puzzle',
		category: 'games',
		entities: ['jigsaw', 'crossword', 'sudoku', 'wordle', 'escape room', 'lego'],
		subjects: ['puzzle'],
		kinds: ['plan', 'chore']
	},

	// Entertainment
	{
		id: 'film',
		category: 'entertainment',
		entities: [
			'movie night',
			'cinema',
			'imax',
			'hoyts',
			'event cinemas',
			'drive in',
			'film festival'
		],
		subjects: ['movie', 'film', 'flick', 'cinema'],
		kinds: ['plan']
	},
	{
		id: 'tv',
		category: 'entertainment',
		entities: ['netflix', 'binge', 'disney plus', 'binge watch', 'prime video', 'foxtel', 'kayo'],
		subjects: ['tv', 'telly', 'series', 'episode', 'season finale', 'show'],
		verbs: ['watch', 'stream'],
		kinds: ['plan']
	},
	{
		id: 'music',
		category: 'entertainment',
		entities: [
			'karaoke',
			'concert',
			'gig',
			'music festival',
			'spotify',
			'choir',
			'orchestra',
			'opera'
		],
		subjects: [
			'music',
			'song',
			'band',
			'festival',
			'guitar',
			'piano',
			'drum',
			'violin',
			'playlist',
			'dj',
			'record',
			'vinyl',
			'singing lesson',
			'music lesson'
		],
		verbs: ['sing', 'practise', 'practice'],
		kinds: ['plan', 'chore']
	},
	{
		id: 'headphones',
		category: 'entertainment',
		subjects: ['podcast', 'audiobook', 'headphones', 'earbuds', 'airpods'],
		verbs: ['listen'],
		kinds: ['plan', 'chore']
	},
	{
		id: 'party',
		category: 'entertainment',
		entities: ['new years', 'new years eve', 'nye', 'hens', 'bucks', 'hens party', 'bucks party'],
		subjects: [
			'party',
			'celebration',
			'celebrate',
			'shindig',
			'engagement',
			'graduation',
			'farewell'
		],
		verbs: ['celebrate'],
		kinds: ['plan']
	},

	// Seasonal: the occasion outranks the meal, so "Christmas lunch" is Christmas.
	{
		id: 'gift',
		category: 'seasonal',
		actions: ['wrap'],
		entities: ['secret santa', 'kris kringle', 'baby shower', 'bridal shower', 'birthday present'],
		subjects: ['birthday', 'bday', 'b-day', 'present', 'gift', 'anniversary'],
		verbs: ['wrap'],
		kinds: ['plan', 'chore'],
		// An age, like "70th" or "21st": 13 and up, so a date like "5th" doesn't count.
		patterns: [/\b(1[3-9]|[2-9]\d|1\d\d)(st|nd|rd|th)\b/]
	},
	{
		id: 'cake',
		category: 'food',
		actions: ['bake'],
		entities: ['birthday cake', 'cupcake'],
		subjects: ['cake', 'cupcake', 'muffin', 'dessert', 'brownie', 'cookie', 'biscuit', 'pavlova'],
		verbs: ['bake', 'ice'],
		kinds: ['plan', 'chore', 'dinner']
	},
	{
		id: 'christmas-tree',
		category: 'seasonal',
		entities: ['christmas', 'xmas', 'chrissy', 'carols', 'carols by candlelight', 'christmas tree'],
		subjects: ['santa'],
		kinds: ['plan', 'chore']
	},
	{
		id: 'bauble',
		category: 'seasonal',
		entities: ['christmas decorations', 'christmas lights'],
		subjects: ['decoration', 'bauble', 'tinsel', 'ornament'],
		verbs: ['decorate'],
		kinds: ['chore']
	},
	{ id: 'stocking', category: 'seasonal', subjects: ['stocking'], kinds: ['chore'] },
	{ id: 'candy-cane', category: 'seasonal', subjects: ['candy cane', 'lolly', 'lollies'] },
	{ id: 'wreath', category: 'seasonal', subjects: ['wreath'], kinds: ['chore'] },
	{ id: 'holly', category: 'seasonal', subjects: ['holly', 'mistletoe'] },
	{
		id: 'snowflake',
		category: 'seasonal',
		entities: ['thredbo', 'perisher', 'falls creek', 'mt buller', 'mount buller', 'niseko'],
		subjects: ['snow', 'ski', 'skiing', 'snowboard', 'snowboarding', 'ice skating', 'snowfield'],
		kinds: ['plan']
	},
	{
		id: 'sun',
		category: 'seasonal',
		entities: ['beach day', 'pool day', 'sunrise', 'sunset'],
		subjects: ['beach', 'sunscreen', 'tan', 'pool', 'summer', 'sunbake'],
		kinds: ['plan']
	},
	{
		id: 'moon',
		category: 'seasonal',
		entities: ['stargazing', 'full moon', 'late night', 'night market'],
		subjects: ['moon', 'stars'],
		kinds: ['plan']
	},
	{
		id: 'sparkles',
		category: 'seasonal',
		entities: ['spring clean', 'deep clean'],
		subjects: ['glitter', 'magic', 'sparkle'],
		kinds: ['chore', 'plan']
	},
	{ id: 'star', category: 'seasonal', subjects: ['award', 'awards', 'oscars'], kinds: ['plan'] },

	// Household and chores
	{
		id: 'bin',
		category: 'household',
		entities: ['bin night', 'green bin', 'yellow bin', 'red bin', 'council pickup', 'hard rubbish'],
		subjects: ['bin', 'rubbish', 'trash', 'garbage', 'recycling', 'compost', 'wheelie bin'],
		kinds: ['chore']
	},
	{
		id: 'vacuum',
		category: 'household',
		actions: ['vacuum', 'hoover', 'vac'],
		entities: ['roomba', 'robot vacuum'],
		subjects: ['vacuum', 'hoover', 'vac', 'carpet', 'rug'],
		verbs: ['vacuum', 'hoover', 'vac'],
		kinds: ['chore']
	},
	{
		id: 'laundry',
		category: 'household',
		actions: ['fold', 'iron'],
		entities: ['washing machine', 'dry cleaning', 'dry cleaner'],
		subjects: [
			'laundry',
			'washing',
			'clothes',
			'towel',
			'ironing',
			'dryer',
			'load',
			'whites',
			'darks'
		],
		verbs: ['fold', 'iron', 'hang out', 'put away'],
		kinds: ['chore']
	},
	{
		id: 'dishes',
		category: 'household',
		entities: ['washing up', 'dish washer'],
		subjects: ['dish', 'dishwasher', 'plate', 'cutlery', 'pot', 'pan'],
		verbs: ['unload', 'stack', 'dry'],
		kinds: ['chore']
	},
	{
		id: 'broom',
		category: 'household',
		actions: ['sweep', 'mop', 'scrub'],
		subjects: [
			'floor',
			'kitchen',
			'bathroom',
			'toilet',
			'shower',
			'benches',
			'mess',
			'house clean',
			'cleaner'
		],
		verbs: ['sweep', 'mop', 'clean', 'tidy', 'dust', 'declutter', 'scrub', 'wipe'],
		kinds: ['chore']
	},
	{
		id: 'plant',
		category: 'household',
		actions: ['water', 'prune', 'repot', 'mow', 'fertilise', 'weed'],
		entities: ['pot plant', 'veggie patch', 'garden centre'],
		subjects: [
			'plant',
			'garden',
			'gardening',
			'lawn',
			'grass',
			'weed',
			'flower',
			'seedling',
			'herb',
			'hedge',
			'tree',
			'mulch'
		],
		verbs: ['water', 'prune', 'repot', 'mow', 'weed', 'plant', 'fertilise'],
		kinds: ['chore']
	},
	{
		id: 'paw',
		category: 'household',
		subjects: [
			'dog',
			'puppy',
			'pup',
			'cat',
			'kitten',
			'pet',
			'vet',
			'groomer',
			'litter',
			'kibble',
			'flea',
			'worming',
			'leash',
			'dog park'
		],
		verbs: ['groom'],
		contexts: ['walk', 'feed'],
		kinds: ['chore', 'plan']
	},
	{
		id: 'air-conditioning',
		category: 'household',
		entities: ['air con', 'aircon', 'split system', 'air conditioner', 'air conditioning'],
		subjects: ['ac', 'heater', 'heating', 'cooling', 'ducted', 'fan'],
		kinds: ['chore']
	},
	{
		id: 'bed',
		category: 'household',
		actions: ['nap'],
		subjects: [
			'bed',
			'sheet',
			'linen',
			'mattress',
			'doona',
			'duvet',
			'pillow',
			'nap',
			'sleep',
			'bedroom'
		],
		verbs: ['sleep', 'nap'],
		kinds: ['chore']
	},
	{
		id: 'sofa',
		category: 'household',
		subjects: ['couch', 'sofa', 'lounge', 'cushion', 'armchair', 'furniture'],
		kinds: ['chore']
	},
	{
		id: 'wifi',
		category: 'household',
		entities: ['nbn', 'wi fi'],
		subjects: ['wifi', 'internet', 'router', 'modem', 'broadband', 'network'],
		kinds: ['chore']
	},
	{
		id: 'lightbulb',
		category: 'household',
		entities: ['light globe', 'light bulb'],
		subjects: [
			'light',
			'bulb',
			'globe',
			'lamp',
			'electrician',
			'power',
			'electricity',
			'idea',
			'brainstorm',
			'smoke alarm'
		],
		kinds: ['chore']
	},
	{
		id: 'key',
		category: 'household',
		entities: ['spare key', 'key cut'],
		subjects: ['key', 'keys', 'locksmith', 'garage door'],
		kinds: ['chore']
	},
	{
		id: 'lock',
		category: 'household',
		entities: ['lock up', 'alarm system'],
		subjects: ['lock', 'security', 'deadbolt', 'password'],
		kinds: ['chore']
	},
	{
		id: 'household',
		category: 'household',
		entities: [
			'open home',
			'open house',
			'house warming',
			'housewarming',
			'move house',
			'moving day',
			'house hunting',
			'real estate'
		],
		subjects: [
			'house',
			'home',
			'inspection',
			'settlement',
			'landlord',
			'tenancy',
			'lease',
			'apartment',
			'unit',
			'flat',
			'tradie',
			'plumber',
			'renovation',
			'reno'
		],
		verbs: ['move'],
		kinds: ['plan', 'chore']
	},
	{
		id: 'settings',
		category: 'household',
		subjects: [
			'repair',
			'maintenance',
			'tap',
			'leak',
			'handyman',
			'tools',
			'drill',
			'flat pack',
			'assemble'
		],
		verbs: ['fix', 'repair', 'assemble', 'install', 'set up', 'service'],
		kinds: ['chore']
	},

	// Food and drink
	{
		id: 'groceries',
		category: 'food',
		entities: [
			'grocery shop',
			'grocery shopping',
			'food shop',
			'woolies',
			'woolworths',
			'coles',
			'aldi',
			'iga',
			'harris farm',
			'costco',
			'farmers market'
		],
		subjects: [
			'market',
			'grocery',
			'groceries',
			'supermarket',
			'milk',
			'bread',
			'eggs',
			'butter',
			'cheese',
			'fruit',
			'snack',
			'toilet paper',
			'loo roll',
			'nappies'
		],
		verbs: ['buy', 'get', 'pick up', 'grab', 'restock', 'stock up'],
		kinds: ['chore']
	},
	{
		id: 'shopping-cart',
		category: 'food',
		entities: [
			'online order',
			'click and collect',
			'kmart',
			'bunnings',
			'ikea',
			'big w',
			'amazon',
			'officeworks'
		],
		subjects: ['shopping', 'shop', 'order', 'mall', 'cart', 'trolley', 'return'],
		verbs: ['order', 'shop', 'return'],
		kinds: ['chore', 'plan']
	},
	{
		id: 'utensils',
		category: 'food',
		entities: [
			'yum cha',
			'degustation',
			'date dinner',
			'dinner reservation',
			'long lunch',
			'bottomless brunch',
			'dinner out',
			'lunch out'
		],
		subjects: [
			'dinner',
			'lunch',
			'brunch',
			'breakfast',
			'restaurant',
			'meal',
			'feast',
			'bbq',
			'barbecue',
			'picnic',
			'banquet',
			'reservation',
			'food',
			'takeaway',
			'eat'
		],
		verbs: ['eat', 'dine'],
		kinds: ['plan', 'dinner']
	},
	{
		id: 'cooking-pot',
		category: 'food',
		actions: ['cook'],
		entities: ['meal prep', 'slow cooker', 'batch cook'],
		subjects: [
			'dinner',
			'lunch',
			'meal',
			'soup',
			'stew',
			'curry',
			'pasta',
			'casserole',
			'roast',
			'stir fry',
			'dhal',
			'risotto',
			'chilli',
			'bolognese',
			'tray bake',
			'pasta bake',
			'pie',
			'lasagne',
			'noodle',
			'ramen',
			'tagine'
		],
		verbs: ['cook', 'make', 'prep', 'simmer', 'roast'],
		kinds: ['dinner', 'chore']
	},
	{
		id: 'chef-hat',
		category: 'food',
		entities: ['cooking class', 'masterchef', 'cook off'],
		subjects: ['chef', 'cooking lesson'],
		kinds: ['plan']
	},
	{
		id: 'recipe-book',
		category: 'food',
		subjects: ['recipe', 'cookbook', 'meal plan'],
		kinds: ['chore', 'dinner']
	},
	{
		id: 'pizza',
		category: 'food',
		entities: ['pizza night', 'pizza oven'],
		subjects: ['pizza', 'calzone'],
		kinds: ['plan', 'dinner']
	},
	{
		id: 'coffee',
		category: 'food',
		entities: ['morning tea', 'high tea', 'flat white', 'coffee date'],
		subjects: ['coffee', 'cafe', 'latte', 'cappuccino', 'espresso', 'tea', 'barista'],
		kinds: ['plan', 'chore']
	},
	{
		id: 'wine',
		category: 'food',
		entities: ['happy hour', 'wine tasting', 'bottle shop', 'bottle o', 'hunter valley', 'barossa'],
		subjects: [
			'wine',
			'drinks',
			'drink',
			'bar',
			'pub',
			'cocktail',
			'beer',
			'champagne',
			'prosecco',
			'winery',
			'brewery',
			'spritz',
			'gin'
		],
		contexts: ['pub', 'bar'],
		kinds: ['plan']
	},
	{
		id: 'ice-cream',
		category: 'food',
		entities: ['gelato', 'ice cream'],
		subjects: ['gelato', 'sundae', 'frozen yoghurt', 'froyo'],
		kinds: ['plan']
	},
	{
		id: 'carrot',
		category: 'food',
		entities: ['fruit and veg', 'green grocer', 'greengrocer'],
		subjects: ['veggie', 'vegetable', 'veg', 'carrot', 'salad', 'produce'],
		kinds: ['chore', 'dinner']
	},
	{
		id: 'egg',
		category: 'food',
		entities: ['easter egg', 'egg hunt', 'easter'],
		subjects: ['egg', 'omelette', 'eggs benedict'],
		kinds: ['plan', 'dinner']
	},
	{
		id: 'water',
		category: 'wellbeing',
		entities: ['drink water', 'water bottle', 'water filter'],
		subjects: ['hydration', 'hydrate', 'water bottle'],
		verbs: ['drink', 'hydrate'],
		kinds: ['chore']
	},

	// Money
	{
		id: 'split-expense',
		category: 'money',
		entities: ['split the bill', 'settle up', 'pay back', 'iou'],
		subjects: ['split', 'owe', 'debt'],
		verbs: ['split', 'settle', 'reimburse'],
		kinds: ['chore']
	},
	{
		id: 'receipt',
		category: 'money',
		entities: [
			'tax return',
			'electricity bill',
			'gas bill',
			'water bill',
			'phone bill',
			'internet bill',
			'council rates',
			'strata'
		],
		subjects: [
			'bill',
			'invoice',
			'receipt',
			'tax',
			'rates',
			'insurance',
			'fine',
			'expense',
			'claim',
			'rebate',
			'medicare'
		],
		verbs: ['pay', 'claim', 'lodge', 'file'],
		kinds: ['chore']
	},
	{
		id: 'dollar',
		category: 'money',
		entities: ['pay day', 'payday', 'pocket money', 'bank transfer'],
		subjects: ['rent', 'mortgage', 'money', 'cash', 'salary', 'deposit', 'bond', 'loan', 'payment'],
		verbs: ['transfer', 'pay', 'save'],
		kinds: ['chore']
	},
	{
		id: 'wallet',
		category: 'money',
		subjects: ['budget', 'savings', 'wallet', 'spending', 'allowance', 'finances', 'bank'],
		verbs: ['budget'],
		kinds: ['chore']
	},
	{
		id: 'card',
		category: 'money',
		entities: ['credit card', 'debit card', 'bank card', 'card statement', 'new card'],
		kinds: ['chore']
	},
	{
		id: 'chart',
		category: 'money',
		subjects: [
			'shares',
			'stocks',
			'investment',
			'invest',
			'super',
			'superannuation',
			'portfolio',
			'report',
			'review',
			'crypto'
		],
		kinds: ['chore']
	},

	// Travel and getting about
	{
		id: 'plane',
		category: 'travel',
		entities: ['qantas', 'jetstar', 'virgin australia', 'check in online', 'long haul'],
		subjects: [
			'flight',
			'airport',
			'plane',
			'overseas',
			'holiday',
			'trip',
			'travel',
			'vacation',
			'abroad',
			'layover',
			'passport',
			'visa'
		],
		verbs: ['fly'],
		kinds: ['plan', 'chore']
	},
	{
		id: 'suitcase',
		category: 'travel',
		entities: ['weekend away', 'airbnb', 'hotel booking'],
		subjects: [
			'luggage',
			'suitcase',
			'bag',
			'hotel',
			'accommodation',
			'getaway',
			'staycation',
			'resort',
			'motel'
		],
		verbs: ['pack', 'unpack'],
		kinds: ['plan', 'chore']
	},
	{
		id: 'car',
		category: 'travel',
		actions: ['drive'],
		entities: [
			'road trip',
			'car wash',
			'car service',
			'car rego',
			'school run',
			'driving lesson',
			'driving test',
			'test drive'
		],
		subjects: [
			'car',
			'ute',
			'rego',
			'petrol',
			'fuel',
			'tyre',
			'mechanic',
			'parking',
			'uber',
			'drive',
			'carpool',
			'pick up from'
		],
		verbs: ['drive'],
		kinds: ['plan', 'chore']
	},
	{
		id: 'map',
		category: 'travel',
		subjects: ['map', 'directions', 'route', 'itinerary', 'tour', 'sightseeing'],
		verbs: ['explore', 'navigate'],
		kinds: ['plan']
	},
	{
		id: 'compass',
		category: 'travel',
		actions: ['hike', 'trek', 'camp'],
		entities: ['national park', 'blue mountains', 'bush walk'],
		subjects: [
			'hike',
			'hiking',
			'bushwalk',
			'trek',
			'camping',
			'camp',
			'adventure',
			'orienteering',
			'trail',
			'mountain',
			'glamping',
			'kayak',
			'canoe'
		],
		verbs: ['hike', 'camp', 'trek'],
		kinds: ['plan']
	},
	{
		id: 'location',
		category: 'travel',
		subjects: ['address', 'meeting point', 'pin', 'venue'],
		kinds: ['plan']
	},

	// People and talking
	{
		id: 'video-call',
		category: 'social',
		actions: ['facetime'],
		entities: ['facetime', 'video call', 'zoom call', 'teams call', 'skype'],
		subjects: ['zoom', 'webcam'],
		kinds: ['plan', 'chore']
	},
	{
		id: 'call',
		category: 'social',
		actions: ['call', 'ring', 'phone'],
		entities: ['phone call'],
		subjects: ['phone', 'call'],
		verbs: ['call', 'ring', 'phone'],
		kinds: ['chore', 'plan']
	},
	{
		id: 'message',
		category: 'social',
		actions: ['text', 'dm'],
		entities: ['whatsapp', 'group chat', 'imessage'],
		subjects: ['text', 'message', 'sms', 'dm'],
		verbs: ['text', 'message', 'reply', 'dm'],
		kinds: ['chore']
	},
	{
		id: 'send',
		category: 'social',
		actions: ['post', 'mail', 'ship'],
		entities: ['post office', 'australia post', 'return to sender'],
		subjects: ['parcel', 'package', 'letter', 'mail', 'postcard', 'card in the mail'],
		verbs: ['post', 'send', 'mail', 'ship'],
		kinds: ['chore']
	},
	{
		id: 'camera',
		category: 'social',
		actions: ['photograph'],
		entities: ['photo shoot', 'family photo'],
		subjects: ['photo', 'photos', 'photographer', 'pic', 'pics', 'camera', 'portrait'],
		verbs: ['photograph', 'film'],
		kinds: ['plan', 'chore']
	},
	{
		id: 'heart',
		category: 'social',
		entities: ['date night', 'valentines', 'valentines day'],
		subjects: ['date', 'love', 'romance', 'proposal'],
		kinds: ['plan']
	},
	{
		id: 'users',
		category: 'social',
		entities: [
			'catch up',
			'hang out',
			'get together',
			'meet up',
			'family dinner',
			'family day',
			'play date',
			'playdate',
			'book club',
			'reunion'
		],
		subjects: [
			'friends',
			'family',
			'visit',
			'visitor',
			'guests',
			'babysitter',
			'babysit',
			'sleepover',
			'in laws'
		],
		verbs: ['visit', 'host', 'meet'],
		kinds: ['plan']
	},
	{
		id: 'chat-bubbles',
		category: 'social',
		subjects: ['chat', 'talk', 'conversation', 'discussion', 'meeting', 'interview', 'debrief'],
		verbs: ['discuss', 'talk', 'chat'],
		kinds: ['plan', 'chore']
	},

	// Planning
	{
		id: 'calendar',
		category: 'planning',
		subjects: [
			'appointment',
			'booking',
			'appt',
			'dentist',
			'doctor',
			'gp',
			'haircut',
			'hairdresser',
			'physio',
			'optometrist',
			'checkup',
			'check up',
			'schedule'
		],
		verbs: ['book', 'schedule', 'reschedule'],
		kinds: ['plan', 'chore']
	},
	{
		id: 'alarm',
		category: 'planning',
		entities: ['wake up', 'early start', 'early flight'],
		subjects: ['alarm', 'reminder'],
		kinds: ['chore']
	},
	{
		id: 'checklist',
		category: 'planning',
		entities: ['to do list', 'todo list'],
		subjects: ['checklist', 'list', 'plan', 'errands', 'jobs', 'admin'],
		verbs: ['plan', 'organise', 'sort out'],
		kinds: ['chore']
	},
	{
		id: 'note',
		category: 'planning',
		subjects: [
			'note',
			'notes',
			'journal',
			'diary',
			'essay',
			'assignment',
			'homework',
			'minutes',
			'form',
			'paperwork'
		],
		verbs: ['write', 'jot', 'fill out', 'fill in', 'sign'],
		kinds: ['chore']
	},
	{
		id: 'bookmark',
		category: 'planning',
		entities: ['library book', 'library'],
		subjects: ['book', 'novel', 'reading', 'chapter', 'kindle'],
		verbs: ['read'],
		kinds: ['chore', 'plan']
	},
	{
		id: 'flag',
		category: 'planning',
		subjects: ['deadline', 'goal', 'milestone', 'due date', 'finish line'],
		kinds: ['chore']
	},

	// Body and wellbeing
	{
		id: 'dumbbell',
		category: 'wellbeing',
		actions: ['lift'],
		entities: ['f45', 'crossfit', 'personal trainer', 'pt session', 'leg day'],
		subjects: ['gym', 'workout', 'weights', 'lift', 'training', 'strength'],
		verbs: ['train', 'lift', 'work out'],
		kinds: ['plan', 'chore']
	},
	{
		id: 'activity',
		category: 'wellbeing',
		actions: ['swim', 'jog', 'cycle', 'surf', 'climb'],
		entities: [
			'parkrun',
			'fun run',
			'city2surf',
			'half marathon',
			'grand final',
			'nrl',
			'afl',
			'state of origin'
		],
		subjects: [
			'run',
			'running',
			'jog',
			'marathon',
			'exercise',
			'yoga',
			'pilates',
			'swim',
			'swimming',
			'cycle',
			'cycling',
			'bike',
			'ride',
			'walk',
			'tennis',
			'footy',
			'football',
			'soccer',
			'netball',
			'basketball',
			'cricket',
			'golf',
			'rugby',
			'surf',
			'surfing',
			'sport',
			'match',
			'game day',
			'training session',
			'climbing',
			'bouldering',
			'dance',
			'dancing'
		],
		verbs: ['run', 'jog', 'swim', 'cycle', 'ride', 'walk', 'stretch', 'surf', 'climb', 'dance'],
		kinds: ['plan', 'chore']
	}
];
