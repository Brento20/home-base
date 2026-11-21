import { expect, test, type Page } from '@playwright/test';

/** Opens a page and waits for the app to be running (not just the HTML), as a person would. */
async function open(page: Page, path: string) {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
}

/** A short tag so this run's items don't collide with an earlier run's on a reused server. */
const run = Date.now().toString(36).slice(-4);

/** Fails the test on any uncaught error in the page. */
function watchErrors(page: Page) {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	return errors;
}

test('Today: hero cards, quick add to Shopping, and the feed pages in', async ({ page }) => {
	const errors = watchErrors(page);
	await open(page, '/');
	await expect(page.locator('.coming-up')).toBeVisible();

	const field = page.locator('.quick-add input');
	await field.fill(`Coffee beans ${run}`);
	await field.press('Enter');
	await expect(page).toHaveURL(/\/$/); // stays on Today
	await expect(page.locator('.shopping .count')).toContainText(`Coffee beans ${run}`);
	await expect(field).toBeFocused(); // keyboard stays up for the next thing

	// The same thing again is refused politely, not duplicated.
	await field.fill(`coffee beans ${run}`);
	await field.press('Enter');
	await expect(page.locator('.shopping .count')).toContainText('already on the list');

	// Three posts come with the page; older ones load as the end nears.
	await expect(page.locator('.posts > li')).toHaveCount(3);
	await page.locator('.feed .end').scrollIntoViewIfNeeded();
	await expect(page.locator('.posts > li')).not.toHaveCount(3);
	expect(errors).toEqual([]);
});

test('Lists: make a list, add, tick, clear; the Shopping list stays', async ({ page }) => {
	const errors = watchErrors(page);
	await open(page, '/lists');
	await page.locator('#new-list-name').fill(`Hardware store ${run}`);
	await page.locator('#new-list-name').press('Enter');
	await expect(page).toHaveURL(/\/lists\/[\w-]+$/);

	const add = page.locator('#new-item');
	for (const item of ['Screws', 'Sandpaper']) {
		await add.fill(item);
		await add.press('Enter');
		await expect(page.locator('.items')).toContainText(item);
	}
	await page.locator('.item-row button').first().click();
	await expect(page.getByText('1 ticked')).toBeVisible();
	await page.getByRole('button', { name: 'Clear' }).click();
	await expect(page.getByText('1 ticked')).toHaveCount(0);

	// The pinned Shopping list has no delete.
	await open(page, '/lists');
	await page.locator('.shopping .head').click();
	await page.getByRole('button', { name: 'Edit' }).click();
	await expect(page.getByText('Delete list')).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('Lists | Tasks switch keeps the heading and switch in place', async ({ page }) => {
	await open(page, '/lists');
	await page.evaluate(() => {
		(document.querySelector('[data-page] h1') as HTMLElement & { mark?: string }).mark = 'same';
	});
	await page.getByRole('link', { name: 'Tasks', exact: true }).click();
	await expect(page).toHaveURL(/\/lists\/tasks$/);
	await expect(page.locator('.task-row').first()).toBeVisible();
	const same = await page.evaluate(
		() => (document.querySelector('[data-page] h1') as HTMLElement & { mark?: string }).mark
	);
	expect(same).toBe('same');
});

test('Tasks: add one, tick it off, undo, and filter to mine', async ({ page }) => {
	const errors = watchErrors(page);
	await open(page, '/lists/tasks');
	await page.fill('#task-title', `Descale the kettle ${run}`);
	await page.locator('.add-button').click();
	const row = page.locator('.task-row').filter({ hasText: `Descale the kettle ${run}` });
	await expect(row).toBeVisible();
	await row.locator('button').first().click();
	await expect(page.getByText(`Ticked off: Descale the kettle ${run}`)).toBeVisible();
	await page.getByRole('button', { name: 'Undo' }).click();
	await expect(row).toBeVisible();

	await page.getByRole('link', { name: 'Mine', exact: true }).click();
	await expect(page).toHaveURL(/who=mine/);
	await expect(page.locator('.task-row').filter({ hasText: 'Chris' })).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('Plans: list and calendar views', async ({ page }) => {
	const errors = watchErrors(page);
	await open(page, '/plans');

	// Later plans come a page at a time, without repeats.
	const first = await (await page.request.get('/plans/later?offset=0&limit=2')).json();
	const next = await (await page.request.get('/plans/later?offset=2&limit=2')).json();
	expect(first.plans).toHaveLength(2);
	expect(first.hasMore).toBe(true);
	const ids = [...first.plans, ...next.plans].map((plan: { id: string }) => plan.id);
	expect(new Set(ids).size).toBe(ids.length);

	await page.getByRole('link', { name: 'Calendar', exact: true }).click();
	await expect(page.locator('.weekdays')).toBeVisible();
	await expect(page.locator('.week')).toHaveCount(6);

	// The month's entries stream in after its grid; then a month on and back again.
	const grid = page.locator('.grid-card');
	await expect(grid).toHaveAttribute('aria-busy', 'false');
	const dots = await page.locator('.grid .dot').count();
	const month = page.locator('h2.month');
	const shown = await month.innerText();
	await page.getByLabel('Next month').click();
	await expect(month).not.toHaveText(shown);
	await expect(page).toHaveURL(/month=\d{4}-\d{2}/);
	await expect(grid).toHaveAttribute('aria-busy', 'false');
	await page.getByLabel('Previous month').click();
	await expect(month).toHaveText(shown);
	await expect(grid).toHaveAttribute('aria-busy', 'false');
	await expect(page.locator('.grid .dot')).toHaveCount(dots);
	expect(errors).toEqual([]);
});

test('Money: reports draw their charts', async ({ page }) => {
	const errors = watchErrors(page);
	await open(page, '/money');
	await page.locator('.group-card').first().click();
	await page.waitForURL(/\/money\/[\w-]+$/);
	await open(page, `${new URL(page.url()).pathname.replace(/\/$/, '')}/reports`);
	await expect(page.locator('.pace svg')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Where it went' })).toBeVisible();
	expect(errors).toEqual([]);
});

test('Home: jobs, Wi-Fi QR and contacts from notes', async ({ page }) => {
	const errors = watchErrors(page);
	await open(page, '/home');
	await expect(page.getByRole('heading', { name: 'This week’s jobs' })).toBeVisible();
	await page.getByRole('button', { name: 'Share' }).click();
	await expect(page.locator('.code svg')).toBeVisible();
	await expect(page.locator('a[href^="tel:"]').first()).toBeVisible();
	expect(errors).toEqual([]);
});

test('Launch screen plays once from the Home Screen, never in a tab', async ({ browser }) => {
	const standalone = await browser.newContext();
	await standalone.addInitScript(() =>
		Object.defineProperty(navigator, 'standalone', { get: () => true })
	);
	const page = await standalone.newPage();
	await open(page, '/');
	await expect(page.locator('#launch svg.launch-logo')).toBeAttached();
	await expect(page.locator('#launch')).toHaveCount(0, { timeout: 6000 });
	await page.reload();
	await expect(page.locator('#launch')).toHaveCount(0);
	await standalone.close();

	const tab = await browser.newContext();
	const tabPage = await tab.newPage();
	await tabPage.goto('/');
	await expect(tabPage.locator('#launch')).toHaveCount(0);
	await tab.close();
});

test('Home settings: a home can change its time zone and currency', async ({ page }) => {
	const errors = watchErrors(page);
	await open(page, '/home/settings');
	const zone = page.locator('select[name="timeZone"]');
	const money = page.locator('select[name="currency"]');
	await expect(zone).toHaveValue('Australia/Sydney');
	await money.selectOption('GBP');
	// Saving reloads the page, so every date and amount redraws: wait for that.
	await Promise.all([
		page.waitForEvent('load'),
		page.getByRole('button', { name: 'Save', exact: true }).click()
	]);
	await open(page, '/money');
	await expect(page.locator('.group-card .balance').first()).toContainText('£');

	// Put it back: sample data is shared by every journey.
	await open(page, '/home/settings');
	await page.locator('select[name="currency"]').selectOption('AUD');
	// Saving reloads the page, so every date and amount redraws: wait for that.
	await Promise.all([
		page.waitForEvent('load'),
		page.getByRole('button', { name: 'Save', exact: true }).click()
	]);
	await open(page, '/money');
	await expect(page.locator('.group-card .balance').first()).toContainText('$');
	expect(errors).toEqual([]);
});

test('Invite links: make one, open it, revoke it', async ({ page, context }) => {
	const errors = watchErrors(page);
	await open(page, '/home/settings');
	await expect(page.getByText('home password')).toHaveCount(0);

	await page.getByLabel('Who it’s for').selectOption('5');
	await page.getByRole('button', { name: 'Create invite link' }).click();
	const field = page.getByLabel('Invite link', { exact: true });
	await expect(field).toHaveValue(/\/join\/[\w-]{32}$/);
	const link = await field.inputValue();
	await expect(page.locator('.invite').first()).toContainText('Works for 5 more people');

	// Copy puts it on the clipboard.
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.getByRole('button', { name: 'Copy link' }).click();
	await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();

	// The sample person already has a home, so the link says so rather than joining.
	const other = await context.newPage();
	await open(other, new URL(link).pathname);
	await expect(other.getByRole('heading', { level: 1 })).toContainText('Join');
	await expect(other.getByText('already in a home')).toBeVisible();

	// Revoked, it stops working.
	const count = await page.locator('.invite').count();
	await page.locator('.invite').first().getByRole('button', { name: 'Revoke' }).click();
	await expect(page.locator('.invite')).toHaveCount(count - 1);
	await open(other, new URL(link).pathname);
	await expect(other.getByRole('heading', { level: 1 })).toHaveText('This invite has run out');

	// Nonsense links get the same answer, not an error.
	await open(other, '/join/not-a-real-invite-token-at-all');
	await expect(other.getByRole('heading', { level: 1 })).toHaveText('This invite has run out');
	expect(errors).toEqual([]);
});

test('Help & privacy: privacy page, data download, leaving', async ({ page }) => {
	const errors = watchErrors(page);
	await open(page, '/home');
	await page.getByRole('link', { name: 'Privacy' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy');
	await expect(page.getByText('no tracking and no analytics')).toBeVisible();

	await open(page, '/home');
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('link', { name: 'Download my data' }).click()
	]);
	expect(download.suggestedFilename()).toMatch(/^home-base-\d{4}-\d{2}-\d{2}\.json$/);
	const file = JSON.parse(
		await new Promise<string>((resolve) =>
			download.createReadStream().then((stream) => {
				let text = '';
				stream.on('data', (chunk) => (text += chunk));
				stream.on('end', () => resolve(text));
			})
		)
	);
	expect(file.home.name).toBeTruthy();
	expect(file.notes.length).toBeGreaterThan(0);

	// The sample home can't be left; the two-tap button explains rather than leaving.
	await open(page, '/home/settings');
	const leave = page.getByRole('button', { name: /^Leave / });
	await leave.click();
	await page.getByRole('button', { name: /Tap again/ }).click();
	await expect(page.getByText('only a preview')).toBeVisible();
	expect(errors).toEqual([]);
});

test('Live refresh: Today reloads its own data each minute, other screens nothing', async ({
	page
}) => {
	await page.clock.install();
	const data: string[] = [];
	page.on('request', (request) => {
		if (!request.url().includes('__data.json')) return;
		const url = new URL(request.url());
		data.push(`${url.pathname} ${url.searchParams.get('x-sveltekit-invalidated') ?? ''}`);
	});

	await open(page, '/');
	data.length = 0;
	await page.clock.runFor(61_000);
	await expect.poll(() => data.length).toBeGreaterThan(0);
	// Only Today's own loader reruns (the last flag); the layouts above it don't.
	expect(data.every((entry) => /^\/__data\.json 0+1$/.test(entry))).toBe(true);

	await page.locator('nav').getByRole('link', { name: 'Plans' }).click();
	await expect(page).toHaveURL(/\/plans/);
	await page.waitForLoadState('networkidle');
	data.length = 0;
	await page.clock.runFor(125_000);
	await page.waitForTimeout(300);
	expect(data).toEqual([]);
});

test('Tabs keep their last screen: back to a tab shows it at once, then updates', async ({
	page,
	context
}) => {
	const errors = watchErrors(page);
	await open(page, '/');
	const tabs = [
		{ name: 'Plans', url: /\/plans/, loading: 'Loading plans' },
		{ name: 'Lists', url: /\/lists$/, loading: 'Loading lists' },
		{ name: 'Money', url: /\/money/, loading: 'Loading money' },
		{ name: 'Home', url: /\/home/, loading: 'Loading home' },
		{ name: 'Today', url: /\/$/, loading: 'Loading today' }
	];
	for (const tab of tabs) {
		await page.locator('nav').getByRole('link', { name: tab.name }).click();
		await expect(page).toHaveURL(tab.url);
		await page.waitForLoadState('networkidle');
	}
	await page.locator('nav').getByRole('link', { name: 'Lists' }).click();
	await expect(page).toHaveURL(/\/lists$/);
	await page.locator('[data-page]').getByRole('link', { name: 'Tasks', exact: true }).click();
	await expect(page).toHaveURL(/\/lists\/tasks/);
	await expect(page.locator('.task-row').first()).toBeVisible();

	// The phone tells the server which tabs it has a copy of.
	const kept = (await context.cookies()).find((cookie) => cookie.name === 'hb_kept')?.value ?? '';
	expect(kept.split('.')).toEqual(
		expect.arrayContaining(['today', 'plans', 'lists', 'tasks', 'money', 'home'])
	);

	// Back on each tab, its content is there straight away: no placeholders.
	for (const tab of tabs) {
		await page.locator('nav').getByRole('link', { name: tab.name }).click();
		await expect(page).toHaveURL(tab.url);
		await expect(page.getByRole('status', { name: tab.loading })).toHaveCount(0);
	}
	expect(errors).toEqual([]);
});

test('Friends and postcards: profile, friends, a friend link, a postcard and a reply', async ({
	page,
	context
}) => {
	const errors = watchErrors(page);
	await open(page, '/home');
	await page.getByRole('link', { name: 'You & friends' }).click();
	await expect(page).toHaveURL(/\/profile$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('You');
	await expect(page.locator('.friend', { hasText: 'Sam' })).toContainText('The Terrace');

	// A line about yourself, written in Edit and shown at the top of your profile.
	await page.getByRole('link', { name: 'Edit' }).click();
	await page.getByLabel('About you').fill(`Waters plants ${run}`);
	await page.getByLabel('Date of birth').fill('1990-06-15'); // required; the sample has none
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page).toHaveURL(/\/home$/);
	await open(page, '/profile');
	await expect(page.locator('.profile-header')).toContainText(`Waters plants ${run}`);

	// A friend link: shown once, listed until it's used or cancelled.
	await page.getByRole('button', { name: 'Make a friend link' }).click();
	const field = page.getByLabel('Friend link', { exact: true });
	await expect(field).toHaveValue(/\/friend\/[\w-]{32}$/);
	const link = await field.inputValue();
	const other = await context.newPage();
	await open(other, new URL(link).pathname);
	await expect(other.getByRole('heading', { level: 1 })).toHaveText('This is your friend link');
	await page.getByRole('button', { name: 'Cancel' }).first().click();
	await open(other, new URL(link).pathname);
	await expect(other.getByRole('heading', { level: 1 })).toHaveText('This friend link has run out');

	// A friend's page, and a postcard to their home.
	await page.locator('.friend', { hasText: 'Sam' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sam');
	await expect(page.locator('.profile-header')).toContainText('Fig tree custodian');
	await page.getByRole('link', { name: 'Send a postcard' }).click();
	await expect(page.locator('select[name="to"]')).toHaveValue('sample-sam');
	// A photo and a few lines, through the same composer as a feed post.
	await page.locator('input[type="file"]').setInputFiles({
		name: 'figs.png',
		mimeType: 'image/png',
		buffer: Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
			'base64'
		)
	});
	await expect(page.locator('.preview img')).toBeVisible();
	await page.getByLabel('Message').fill(`Wish you were here ${run}`);
	await page.getByRole('button', { name: 'Send', exact: true }).click();
	await expect(page).toHaveURL(/\/profile\/sample-sam\?sent/);
	await expect(page.getByRole('status')).toContainText('Postcard sent');
	// It's in the postcards between you, and opens as yours, with Take it back.
	const sent = page.locator('.postcard-list .grouped-row', {
		hasText: `Wish you were here ${run}`
	});
	await expect(sent).toContainText('To Sam');
	await sent.click();
	await expect(page.locator('.postcard')).toContainText('Your postcard to Sam');
	await expect(page.getByRole('button', { name: 'Take it back' })).toBeVisible();

	// Sam's postcard to this home sits in the feed: react on the card, reply on its page.
	await open(page, '/');
	const postcard = page.locator('.postcard').first();
	if (await postcard.count()) {
		await expect(postcard).toContainText('Postcard from Sam');
		const love = postcard.getByRole('button', { name: /^Love/ });
		const pressed = await love.getAttribute('aria-pressed');
		await love.click();
		await expect(love).toHaveAttribute('aria-pressed', pressed === 'true' ? 'false' : 'true');
		await postcard.locator('.open').click();
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Postcard');
		await expect(page.getByRole('link', { name: 'Send one back' })).toHaveAttribute(
			'href',
			'/postcards/new?to=sample-sam'
		);
		await page.locator('textarea#reply').fill(`Count me in ${run}`);
		await page.getByRole('button', { name: 'Send', exact: true }).click();
		await expect(page.locator('.reply', { hasText: `Count me in ${run}` })).toContainText('You');
		await page.getByRole('button', { name: 'Take it down' }).click();
		await page.getByRole('button', { name: 'Tap again to take it down' }).click();
		await expect(page).toHaveURL(/\/$/);
	}
	expect(errors).toEqual([]);
});

test('House-sitter link: pick what to share, open it signed out, stop it', async ({
	page,
	browser
}) => {
	const errors = watchErrors(page);
	await open(page, '/home');
	await page.getByRole('link', { name: 'House-sitter link' }).click();
	await page.getByLabel('Who it’s for').fill(`Sam ${run}`);
	await page.getByLabel('A message for them').fill('Feed Pickles twice a day.');
	await page.getByRole('checkbox', { name: /Wifi/ }).check();
	await page.getByRole('button', { name: 'Make a sitter link' }).click();
	const field = page.getByLabel('House-sitter link', { exact: true });
	await expect(field).toHaveValue(/\/sitter\/[\w-]{32}$/);
	const link = new URL(await field.inputValue()).pathname;
	await expect(page.locator('.grouped-row', { hasText: `Sam ${run}` })).toContainText('1 note');

	// A stranger's browser: no cookies, no account.
	const sitterContext = await browser.newContext();
	const sitter = await sitterContext.newPage();
	await open(sitter, link);
	await expect(sitter.getByRole('heading', { level: 1 })).toContainText('Looking after');
	await expect(sitter.getByText('Feed Pickles twice a day.')).toBeVisible();
	await expect(sitter.locator('.wifi, [class*="wifi"]').first()).toBeVisible();
	// Only what was picked: no money, no other notes.
	await expect(sitter.getByText('Plumber')).toHaveCount(0);
	await expect(sitter.getByText(/owes|\$\d/)).toHaveCount(0);
	await expect(sitter.locator('nav[aria-label="Main"]')).toHaveCount(0);

	// Stopped, it ends at once.
	await page
		.locator('.grouped-row', { hasText: `Sam ${run}` })
		.getByRole('button', { name: 'Stop' })
		.click();
	await expect(page.locator('.grouped-row', { hasText: `Sam ${run}` })).toHaveCount(0);
	await open(sitter, link);
	await expect(sitter.getByRole('heading', { level: 1 })).toHaveText('This link has ended');
	await sitterContext.close();
	expect(errors).toEqual([]);
});

test('Plan invites: answer for yourself, see who is going, invite a friend, add someone you went with', async ({
	page
}) => {
	const errors = watchErrors(page);
	await open(page, '/plans');
	const invite = page.locator('a', { hasText: 'Long lunch at The Terrace' }).first();
	await expect(invite).toContainText('Sam invited you');

	// Another home's plan: no Edit, and your answer is yours alone.
	await invite.click();
	await expect(page.getByText('Sam invited your home')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0);
	const going = page.getByRole('button', { name: 'Going', exact: true });
	if ((await going.getAttribute('aria-pressed')) === 'true') await going.click(); // a rerun
	await going.click();
	await expect(going).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('.summary-line').first()).toContainText('you are going');
	await expect(page.locator('.guest', { hasText: 'Chris' })).toContainText('Hasn’t replied');

	// Your own plan: invite a friend, and their home turns up on the guest list.
	await open(page, '/plans');
	await page.locator('a', { hasText: 'Saturday markets' }).first().click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Saturday markets');
	const inviteSam = page.locator('.grouped-row', { hasText: 'The Terrace' }).getByRole('button', {
		name: 'Invite'
	});
	if (await inviteSam.count()) await inviteSam.click();
	await expect(page.locator('.home-title', { hasText: 'The Terrace' })).toBeVisible();
	await expect(page.locator('.guest', { hasText: 'Brenton (you)' })).toContainText('Going');

	// A plan you went to together: add Alex as a friend without a link.
	await open(page, '/plans/sample-plan-trivia');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trivia night');
	const alex = page.locator('.guest', { hasText: 'Alex' });
	const add = alex.getByRole('button', { name: 'Add friend' });
	if (await add.count()) {
		await add.click();
		await expect(page.getByRole('status')).toContainText('You’re friends now');
		await open(page, '/profile');
		await expect(page.locator('.friend', { hasText: 'Alex' })).toBeVisible();
	}
	expect(errors).toEqual([]);
});
