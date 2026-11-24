/**
 * home base's voice: warm, a bit cheeky, said the way you'd say it to the person you live with.
 * Prompts ask a question instead of naming a form ("What's the plan?", not "New plan").
 *
 * Every list here is a set of options. Headings and empty states take one at random per visit
 * (the first is the default, used on first load); placeholder reels scroll through a shuffled
 * pool. Roughly half of each pool is pop culture, with a Sydney accent. References are timeless:
 * classics everyone knows (Mean Girls, Friends, Harry Potter, Home and Away), never this year's
 * trend, so the app doesn't date.
 *
 * Keep each line short enough for one line on a phone, never quote lyrics, and don't put words
 * in a real person's mouth.
 */

// Headings ------------------------------------------------------------------------------------

export const HEADINGS = {
	newPlan: ['What’s the plan?', 'What are we doing?', 'Ooh, what’s on?', 'Make it happen'],
	editPlan: ['Change of plans?', 'Tweak the plan', 'Plot twist?'],
	newTask: ['Another job?', 'Put it on the list', 'Something to do?', 'Add a job'],
	editTask: ['Tweak the task', 'Change of plan?', 'Fix it up'],
	importCalendar: ['Bring your calendar over', 'Move in your calendar'],
	newNote: ['What should everyone know?', 'Jot it down', 'Pin it to the fridge'],
	editNote: ['Update the note', 'Fix it up'],
	newGroup: ['What are we splitting?', 'Who’s chipping in?', 'Start a kitty'],
	addExpense: ['What did it cost?', 'Who’s out of pocket?', 'Another one?'],
	editExpense: ['Fix the numbers', 'Adjust the damage'],
	settleUp: ['Squaring up?', 'Time to square up', 'Paying it back'],
	reports: ['Where’s it all going?', 'Follow the money', 'The damage report'],
	postUpdate: ['What’s new at home?', 'Got news?', 'Spill the tea', 'Tell the house'],
	scores: ['Who’s winning?', 'The leaderboard', 'Chore champions'],
	pastTasks: ['Done and dusted', 'Look what you did'],
	pastLists: ['Ticked off', 'Done and dusted'],
	setupProfile: ['Tell us about you', 'Who’s this, then?', 'Let’s meet you'],
	editProfile: ['About you', 'You, in a nutshell'],
	buildHome: ['Name your place', 'Give it a name'],
	joinHome: ['Knock knock', 'Find your people'],
	signUp: ['Make yourself at home', 'Pull up a chair'],
	signIn: ['Welcome back', 'Hey, you’re back'],
	forgotPassword: ['Forgot it? Happens', 'Let’s get you back in'],
	newPassword: ['Pick a new password', 'Fresh start'],
	checkEmail: ['Check your inbox', 'Look out for an email'],
	homeSettings: ['House rules', 'Home settings'],
	groupSettings: ['Group settings', 'Tidy up the group'],
	dinner: ['What’s for dinner?', 'What are we cooking?', 'Hungry yet?', 'Dinner, sorted'],
	newRecipe: ['Add a recipe', 'Share the secret recipe', 'What’s the recipe?'],
	editRecipe: ['Tweak the recipe', 'Fix up the recipe']
} as const;

// Placeholder reels ---------------------------------------------------------------------------

export const PLACEHOLDERS = {
	planTitle: [
		'Shucking oysters on the beach?',
		'Brunch with Gaga?',
		'Bondi to Coogee walk?',
		'Second breakfast?',
		'Dumplings in Haymarket?',
		'Wearing pink on Wednesday?',
		'Bunnings sausage sizzle run?',
		'A Back to the Future marathon?',
		'Picnic at the Botanic Garden?',
		'Mario Kart grudge match?',
		'Trivia at the local?',
		'A Bluey marathon?'
	],
	planWhere: [
		'The couch, obviously',
		'Bondi Icebergs',
		'Central Perk',
		'Mamak, Haymarket',
		'Ramsay Street',
		'The backyard',
		'Summer Bay',
		'The Opera House steps',
		'The Bluey house',
		'Our place'
	],
	planNotes: [
		'BYO snacks',
		'Nobody puts Baby in a corner',
		'Spoilers will not be tolerated',
		'Bring a jumper, it gets cold',
		'I’ll drive, you DJ',
		'Fancy dress: Clueless plaid encouraged',
		'Someone remember to book',
		'Full Kath & Kim energy, please',
		'Leave room for dessert'
	],
	task: [
		'Take the bins out',
		'Water the monstera',
		'Descale the kettle',
		'Clean the fridge before we need Ghostbusters',
		'Book the plumber',
		'Defrost the freezer, Elsa',
		'Vacuum like we’re on The Block',
		'Change the sheets',
		'Feed the sourdough starter',
		'Marie Kondo the linen cupboard',
		'Fold the washing mountain',
		'Return the Kmart haul'
	],
	listName: [
		'Hardware run',
		'Weekend groceries',
		'Bunnings wishlist',
		'Hogwarts supply list',
		'Star Wars, in the right order',
		'Camping trip',
		'Barbie Dreamhouse upgrades',
		'Party supplies',
		'ABBA night supplies',
		'Bluey birthday party',
		'Christmas presents',
		'Pharmacy'
	],
	listItem: [
		'Oat milk',
		'Bin bags',
		'Tim Tams',
		'A Duff (kidding)',
		'Avocados (if they’re under $2)',
		'Lightbulbs',
		'Coffee. So much coffee',
		'A Furby (don’t judge)',
		'Toilet paper',
		'Vegemite',
		'Popcorn for movie night',
		'Snacks for the Friends rewatch'
	],
	noteTitle: [
		'Wifi',
		'Bin night',
		'Where the spare key lives',
		'Mario Kart house rules',
		'Landlord’s number',
		'How the TV remote works',
		'The streaming passwords',
		'Plant watering roster',
		'Spoiler-free zone'
	],
	noteBody: [
		'Network name and password',
		'Bins out Tuesday night, recycling every second week',
		'Under the third pot plant. Don’t tell anyone',
		'Hold the button for three seconds, then pray',
		'First rule of bin night: we always talk about bin night',
		'Blue shells are allowed. Sore losers aren’t'
	],
	post: [
		'Left dinner in the fridge',
		'Anyone keen for dumplings Friday?',
		'Who finished the milk?',
		'The plumber’s coming at 10',
		'Watched Titanic again. There was room on that door',
		'Running late, save me some pasta',
		'Friends marathon tonight, I’m making popcorn',
		'Bluey made me cry again',
		'Bought a new plant. His name is Kevin',
		'May the Force be with my sourdough',
		'Parcel’s on the doorstep',
		'Movie night? Mean Girls or Clueless?'
	],
	postcard: [
		'Greetings from our place!',
		'The figs are finally ripe',
		'Thinking of you. Dinner soon?',
		'Look what we found at the markets',
		'The cat says hi'
	],
	reply: [
		'Count me in',
		'Say something nice…',
		'Yes, chef!',
		'On my way',
		'That’s so fetch',
		'Absolutely not',
		'Perfect, I’ll grab it later',
		'As if!',
		'Save me a seat'
	],
	homeName: [
		'Our Place',
		'The Burrow',
		'Summer Bay',
		'Ramsay Street',
		'Central Perk',
		'The Bluey house',
		'Casa de Chaos',
		'The Treehouse',
		'The Shire',
		'The Bondi flat'
	],
	groupName: [
		'Bills and bits',
		'Groceries',
		'Bali trip',
		'The Hogwarts tuition fund',
		'Splendour weekend',
		'Streaming subscriptions',
		'Housewarming',
		'Christmas presents'
	],
	expense: [
		'Groceries',
		'Uber Eats, again',
		'Electricity bill',
		'Bunnings run',
		'Festival tickets',
		'Streaming',
		'Dumplings',
		'Pizza for movie night',
		'IKEA haul',
		'Mamma Mia! tickets (worth it)',
		'Pet food'
	]
} as const;

// Empty states --------------------------------------------------------------------------------

/** Search placeholders for the recipe library: the first line says what it searches. */
export const RECIPE_SEARCH = [
	'Search dishes or ingredients',
	'Chicken?',
	'Something with mushrooms?',
	'Pasta, obviously',
	'What’s in the fridge?',
	'Lentils?',
	'Winner winner, chicken dinner?',
	'Comfort food?'
];

export const RECIPE_TITLE = [
	'Nonna’s lasagne',
	'Friday night curry',
	'Mum’s famous meatloaf',
	'The good fried rice',
	'Hangover pasta',
	'Dad’s chilli'
];

export const EMPTY = {
	tasks: [
		'Nothing to do. Suspicious. Add the next chore above.',
		'All clear. Enjoy it while it lasts.',
		'Not a chore in sight. Add one above when it comes up.'
	],
	lists: [
		'No lists on the go. Start one above.',
		'Nothing to buy. Wallets everywhere rejoice.',
		'All clear. Start a list above when you need one.'
	],
	plans: ['Nothing planned yet.', 'The calendar’s wide open.', 'Nothing on. Yet.'],
	comingUpTitle: ['Nothing coming up', 'A wide-open week', 'Not a thing on'],
	comingUpAction: ['Make a plan', 'Fix that', 'Plan something'],
	/** Followed by a "Post an update" link. */
	feed: [
		'Quiet in here. Updates show up for everyone at home.',
		'Nothing yet. Leave the first note on the fridge.',
		'No posts yet. Someone has to go first.'
	],
	notes: [
		'Add the wifi password, bin nights, where the spare key lives. Everyone here can see them.',
		'The fridge door, but digital. Add the wifi, bin night, the spare key spot.'
	],
	points: ['Tick off a task to get on the board.', 'The board’s empty. First chore wins.'],
	pastLists: ['Finished lists will show up here.'],
	pastTasks: ['Ticked-off tasks will show up here.'],
	recipes: [
		'Nothing matches that.',
		'No luck. Try fewer filters?',
		'Nothing in the cookbook for that.'
	]
} as const;

// AI helpers ------------------------------------------------------------------------------------

/**
 * When an AI helper can't do it (no answer, a timeout, a blurry photo, not a recipe), the form
 * stays right there to fill by hand. The first line is the one the household asked for.
 */
export const AI_OOPS = [
	'Oops! I can’t work out a thing today! Enter it manually 👉👈',
	'Hmm, that one stumped me. Mind popping it in by hand? 👉👈',
	'My brain’s gone blank! Fill it in below and I’ll owe you one 👉👈'
] as const;
