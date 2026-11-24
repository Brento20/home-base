/**
 * Every request is in one of four stages, and each stage has pages it may open.
 * hooks.server.ts works out the stage; redirectFor decides where anyone in the wrong place goes.
 */
export type Stage = 'signed-out' | 'profile' | 'home' | 'ready';

/** Where each stage lands. */
const stageHome: Record<Stage, string> = {
	'signed-out': '/welcome',
	profile: '/setup/profile',
	home: '/setup',
	ready: '/'
};

export function stageFor(signedIn: boolean, onboarded: boolean, hasHome: boolean): Stage {
	if (!signedIn) return 'signed-out';
	if (!onboarded) return 'profile';
	if (!hasHome) return 'home';
	return 'ready';
}

/** The page to send this request to instead, or null to let it through. */
export function redirectFor(stage: Stage, routeId: string | null): string | null {
	// Unknown pages fall through to the 404.
	if (!routeId) return null;

	// Sign up, sign in and the landing page are only for people who are signed out.
	if (routeId.startsWith('/(public)')) return stage === 'signed-out' ? null : stageHome[stage];

	// Email links, invite, friend and house-sitter links, the privacy page and signing out work in
	// any stage. Invite and friend links say what to do next for the stage you're in
	// (src/routes/join/[token], src/routes/friend/[token]); a sitter page needs no account at all.
	if (
		routeId.startsWith('/auth/') ||
		routeId.startsWith('/join/') ||
		routeId.startsWith('/friend/') ||
		routeId.startsWith('/sitter/') ||
		routeId === '/privacy' ||
		routeId === '/logout'
	)
		return null;

	if (stage === 'signed-out') return stageHome[stage];

	// A new password, and photos, need a session and nothing more.
	if (routeId.startsWith('/account/') || routeId.startsWith('/avatars/')) return null;

	if (routeId === '/(setup)/setup/profile') {
		if (stage === 'ready') return '/profile/details';
		return null;
	}

	if (routeId.startsWith('/(setup)')) return stage === 'home' ? null : stageHome[stage];
	if (routeId.startsWith('/(app)')) return stage === 'ready' ? null : stageHome[stage];

	return null;
}
