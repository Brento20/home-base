<script lang="ts">
	/**
	 * What home base keeps, where, and who can see it. Open to everyone (stage.ts), signed in or
	 * not. Keep it true: when the app starts keeping something new, say so here.
	 */
	import Icon from '#lib/ui/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const CONTACT = 'brenton.weaver@gmail.com';
	const home = $derived(data.stage === 'ready');

	// Signed out or setting up, it was opened from sign-up or the welcome screen: go back there.
	function back(event: MouseEvent) {
		if (home || history.length < 2) return;
		event.preventDefault();
		history.back();
	}
	const UPDATED = '21 November 2026';
</script>

<svelte:head>
	<title>Privacy · home base</title>
	<meta name="description" content="What home base keeps, where it lives, and who can see it." />
</svelte:head>

<main class="privacy" data-page>
	<a class="button-quiet back" href={home ? '/home' : '/welcome'} onclick={back}>
		<Icon name="back" size={18} />
		{home ? 'Home' : 'Back'}
	</a>
	<h1>Privacy</h1>
	<p class="lead">
		What home base keeps, where it lives and who can see it, in plain words. Updated {UPDATED}.
	</p>

	<section>
		<h2>Who runs it</h2>
		<p>
			home base is made and run by Brenton Weaver, an independent developer in Sydney, Australia.
			Questions, requests or worries go to <a href="mailto:{CONTACT}">{CONTACT}</a>.
		</p>
	</section>

	<section>
		<h2>What it keeps</h2>
		<ul>
			<li>
				<strong>Your account:</strong> your email address and password. The password is stored scrambled
				(hashed), so no one can read it, not even Brenton.
			</li>
			<li>
				<strong>Your profile:</strong> the name, nickname, pronouns, birthday, colour and photo you choose
				to add, and your preferences (how the app looks to you, like light or dark and calmer screens).
			</li>
			<li>
				<strong>Your home:</strong> what you and the people you live with put in it: tasks, lists, plans,
				recipes, money, posts, photos and notes.
			</li>
			<li>
				<strong>Friends and postcards:</strong> who your friends are, anyone you’ve blocked, the postcards
				you send, and your reactions and replies on postcards. A postcard keeps your name and your home’s
				name as they were when you sent it.
			</li>
			<li>
				<strong>Friend requests and your friend code:</strong> requests you’ve sent and received until
				they’re answered, your code, and a day’s record of codes you’ve tried (so codes can’t be guessed).
			</li>
			<li>
				<strong>Your public profile:</strong> the line about you and the answers you choose to add, like
				your neighbourhood or what you’re known for.
			</li>
			<li>
				<strong>Plan invites:</strong> which homes a plan was shared with, and each person’s answer.
			</li>
			<li>
				<strong>Links:</strong> for invite, friend and house-sitter links, only a scrambled fingerprint
				of each link, so a link can be checked without being stored.
			</li>
		</ul>
		<p>There are no ads, no tracking and no analytics. Nothing is sold or shared for marketing.</p>
	</section>

	<section>
		<h2>Who can see it</h2>
		<p>
			Everything in a home is visible to everyone in that home, and to no one else. Notes marked
			secret are hidden behind dots on screen and locked (encrypted) in the database, so they can’t
			be read from the database alone.
		</p>
		<p>
			Anyone signed in to home base can see your public profile: your name, colour, your home’s
			name, the line about you and the answers you’ve added. Not your photo or your pronouns: those
			are for you and the people you live with. Someone you’ve blocked, or who has blocked you, sees
			nothing.
		</p>
		<p>
			Friends also see your photo, and nothing in your home. A postcard is seen by everyone in the
			home it’s sent to and by you; both sides can react and reply, and anyone there can take it
			down or block you.
		</p>
		<p>
			When your home is invited to a plan, everyone in both homes sees the plan, who’s on it and
			each person’s answer. Only the home that made the plan can change it.
		</p>
		<p>
			A house-sitter link shows whoever has it a single page with only what the person who made it
			picked: a message, chosen notes (secret ones too, if picked) and the chores. Never money. It
			stops working at the end of its last day, or sooner if someone in the home stops it.
		</p>
		<p>
			As the person running the service, Brenton can reach the database to keep it working and fix
			problems. He doesn’t look through homes, and won’t without your say-so or a legal requirement.
		</p>
	</section>

	<section>
		<h2>Where it lives</h2>
		<ul>
			<li>
				<strong>Supabase</strong> stores the database, photos and sign-ins (<a
					href="https://supabase.com/privacy">their privacy policy</a
				>).
			</li>
			<li>
				<strong>Cloudflare</strong> runs the app itself and may keep short-lived request logs, such
				as IP addresses, to keep it running and secure (<a
					href="https://www.cloudflare.com/privacypolicy/">their privacy policy</a
				>).
			</li>
			<li>
				<strong>Anthropic</strong> runs Claude, the AI behind the optional helpers: importing a
				recipe, quick add, reading a receipt and the line about your week on Today. When you use
				one, what it needs (the text, link or photo you gave it, or a summary of your week) is sent
				to Anthropic to do that one job (<a href="https://www.anthropic.com/legal/privacy"
					>their privacy policy</a
				>). If you don’t use them, nothing is sent.
			</li>
		</ul>
		<p>These services may store data outside Australia.</p>
	</section>

	<section>
		<h2>Cookies</h2>
		<p>
			A few small cookies, all needed for the app to work: one keeps you signed in, one remembers
			your theme, one holds an invite link while you sign up, and a couple remember screen choices
			(like which Plans view you last used). None are for tracking.
		</p>
	</section>

	<section>
		<h2>Your data, your call</h2>
		<ul>
			<li>
				<strong>Download it:</strong> Home › Help &amp; privacy › Download my data gives you everything
				you can see, as a file.
			</li>
			<li>
				<strong>Leave a home:</strong> Home settings › Leaving. If you’re the last one there, the home
				and everything in it is deleted.
			</li>
			<li>
				<strong>Friends:</strong> remove or block anyone from their page in You &amp; friends. Blocking
				takes their postcards off your home’s feed and stops new ones.
			</li>
			<li>
				<strong>Delete your account:</strong> email <a href="mailto:{CONTACT}">{CONTACT}</a> from the
				address you signed up with. Your account and profile are deleted within 30 days. What you added
				to a home others still use stays with that home unless you ask for it removed.
			</li>
		</ul>
	</section>

	<section>
		<h2>Changes</h2>
		<p>If this page changes in a way that matters, the app will say so before it takes effect.</p>
	</section>
</main>

<style>
	.privacy {
		max-width: 40rem;
		margin: 0 auto;
		padding: calc(env(safe-area-inset-top) + 24px) var(--page-gutter)
			calc(env(safe-area-inset-bottom) + 48px);
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		min-height: var(--tap-target);
		margin-left: -8px;
	}

	h1 {
		margin-top: var(--space-l);
		font-size: var(--text-page-title);
		font-weight: var(--weight-strong);
		letter-spacing: var(--tracking-tight);
	}

	.lead {
		margin-top: var(--space-s);
		color: var(--colour-text-muted);
		text-wrap: pretty;
	}

	section {
		margin-top: var(--space-xl);
	}

	h2 {
		font-size: var(--text-body);
		font-weight: var(--weight-strong);
	}

	p,
	ul {
		margin-top: var(--space-s);
		line-height: 1.55;
		text-wrap: pretty;
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
		padding-left: 1.2em;
	}

	strong {
		font-weight: var(--weight-medium);
	}

	a:not(.button-quiet) {
		color: var(--colour-accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
