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

test('Today: the add bar adds a task (with Undo) or starts a plan', async ({ page }) => {
	const errors = watchErrors(page);
	await open(page, '/');
	const bar = page.locator('#add-bar');
	await expect(bar).toBeVisible();
	// The choices only appear, in the dock above the tab bar, once something's typed.
	const dock = page.locator('.action-dock');
	await expect(dock).toHaveCount(0);

	// Return adds it as a task, for anyone, with no date, and stays on Today.
	await bar.fill(`Oil the gate ${run}`);
	await expect(
		dock.getByRole('button', { name: `Add “Oil the gate ${run}” as a task` })
	).toBeVisible();
	await expect(dock.getByRole('link', { name: `Make “Oil the gate ${run}” a plan` })).toBeVisible();
	// The clear button empties the field (and the dock goes), then it's typed again.
	await page.getByRole('button', { name: 'Clear' }).click();
	await expect(bar).toHaveValue('');
	await expect(dock).toHaveCount(0);
	await bar.fill(`Oil the gate ${run}`);
	await bar.press('Enter');
	await expect(page).toHaveURL(/\/$/);
	const toast = page.locator('.undo-toast');
	await expect(toast).toContainText(`Added to Tasks: Oil the gate ${run}`);
	await expect(bar).toHaveValue('');
	await open(page, '/lists/tasks');
	await expect(page.getByText(`Oil the gate ${run}`)).toBeVisible();

	// Undo takes it away again.
	await open(page, '/');
	await bar.fill(`Wash the car ${run}`);
	await page.getByRole('button', { name: `Add “Wash the car ${run}” as a task` }).click();
	await page.locator('.undo-toast').getByRole('button', { name: 'Undo' }).click();
	await open(page, '/lists/tasks');
	await expect(page.getByText(`Oil the gate ${run}`)).toBeVisible();
	await expect(page.getByText(`Wash the car ${run}`)).toHaveCount(0);

	// Plan carries the words to New plan.
	await open(page, '/');
	await bar.fill(`Picnic ${run}`);
	await page.getByRole('link', { name: `Make “Picnic ${run}” a plan` }).click();
	await expect(page).toHaveURL(/\/plans\/new\?text=/);
	await expect(page.locator('#plan-title')).toHaveValue(`Picnic ${run}`);
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

test('New task: the full form, like a new plan, then the same form to edit it', async ({
	page
}) => {
	const errors = watchErrors(page);
	await open(page, '/lists/tasks');

	// What's typed in the quick bar carries over to the full form.
	await page.fill('#task-title', `Clean the gutters ${run}`);
	await page.getByRole('link', { name: /Add who, when or a repeat/ }).click();
	await expect(page).toHaveURL(/\/lists\/tasks\/new\?title=/);
	await expect(page.locator('#task-form-title')).toHaveValue(`Clean the gutters ${run}`);

	// Who, when, then the extras behind their chips.
	await page.locator('fieldset', { hasText: 'Who’s on it?' }).getByText('Chris').click();
	await page.getByText('Tomorrow', { exact: true }).click();
	await expect(page.getByRole('group', { name: 'How often?' })).toBeHidden();
	await page.locator('label[for="task-add-repeat"]').click();
	await page.getByRole('group', { name: 'How often?' }).getByText('Weekly').click();
	await page.locator('label[for="task-add-notes"]').click();
	await page.getByLabel('Anything to add?').fill('Ladder is in the shed');
	await page.getByRole('button', { name: 'Add task' }).click();

	await expect(page).toHaveURL(/\/lists\/tasks$/);
	const row = page.locator('.task-row').filter({ hasText: `Clean the gutters ${run}` });
	await expect(row).toContainText('Chris');
	await row.locator('a').first().click();
	await expect(page.getByText('Ladder is in the shed')).toBeVisible();
	await expect(page.locator('.details')).toContainText('Weekly');

	// Editing opens the same form, with its extras already open.
	await page.getByRole('link', { name: 'Edit' }).click();
	await expect(page.locator('#task-form-title')).toHaveValue(`Clean the gutters ${run}`);
	await expect(page.getByLabel('Anything to add?')).toHaveValue('Ladder is in the shed');
	await expect(page.getByRole('group', { name: 'How often?' })).toBeVisible();

	// The header + on Tasks opens it too, and an empty form says what's missing.
	await open(page, '/lists/tasks');
	await page.getByRole('link', { name: 'New task' }).click();
	// Tasks' quick bar has an "Add task" button too, so wait for the form first.
	await expect(page).toHaveURL(/\/lists\/tasks\/new/);
	await expect(page.locator('#task-form-title')).toBeVisible();
	await page.getByRole('button', { name: 'Add task' }).click();
	await expect(page.getByText('Give the task a name.')).toBeVisible();
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
	// Your face, top right on the Home tab, opens You & friends.
	await open(page, '/home');
	await page
		.getByRole('link', { name: /^You & friends/ })
		.first()
		.click();
	await expect(page).toHaveURL(/\/profile$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('You & friends');
	await expect(page.locator('.friend', { hasText: 'Sam' })).toContainText('The Terrace');

	// Edit profile: what others see, the public answers included, shown on your card.
	await page.getByRole('link', { name: 'Edit profile' }).click();
	await expect(page.getByLabel('Nickname')).toBeVisible();
	await expect(page.getByLabel('First name')).toHaveCount(0); // private: under Details
	await expect(page.getByLabel('Pronouns')).toHaveCount(0);
	await page.getByLabel('About you').fill(`Waters plants ${run}`);
	await page.getByLabel('Known for').fill(`Lasagne ${run}`);
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page).toHaveURL(/\/profile$/);
	await expect(page.locator('.profile-header')).toContainText(`Waters plants ${run}`);
	await expect(page.locator('.public-fields')).toContainText(`Lasagne ${run}`);

	// A friend link: shown once, listed until it's used or cancelled.
	await page.getByRole('button', { name: 'Make a friend link' }).click();
	const field = page.getByLabel('Friend link', { exact: true });
	await expect(field).toHaveValue(/\/friend\/[\w-]{32}$/);
	const link = await field.inputValue();
	const other = await context.newPage();
	await open(other, new URL(link).pathname);
	await expect(other.getByRole('heading', { level: 1 })).toHaveText('This is your friend link');
	// Links waiting to be opened are under Manage friends.
	await page.getByRole('link', { name: /Manage friends/ }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Manage friends');
	await page.getByRole('button', { name: 'Cancel' }).first().click();
	await expect(page.getByText('Links waiting to be opened')).toHaveCount(0);
	await open(other, new URL(link).pathname);
	await expect(other.getByRole('heading', { level: 1 })).toHaveText('This friend link has run out');

	// A friend's page, and a postcard to their home.
	await open(page, '/profile');
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
	// Not a friend yet: their name opens their public profile.
	if (await alex.getByRole('button', { name: 'Add friend' }).count()) {
		await alex.locator('.guest-link').click();
		await expect(page).toHaveURL(/\/people\/sample-alex$/);
		await expect(page.locator('.public-fields')).toContainText('Pub trivia');
		await expect(
			page.getByRole('button', { name: /Send friend request|Cancel request|Accept/ })
		).toBeVisible();
		await page.goBack();
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trivia night');
	}
	const add = alex.getByRole('button', { name: 'Add friend' });
	if (await add.count()) {
		await add.click();
		await expect(page.getByRole('status')).toContainText('You’re friends now');
		await open(page, '/profile');
		await expect(page.locator('.friend', { hasText: 'Alex' })).toBeVisible();
	}
	expect(errors).toEqual([]);
});

test('You & friends: Edit profile, Preferences, Details and account, and old links', async ({
	page
}) => {
	const errors = watchErrors(page);
	await open(page, '/profile');
	await expect(page.getByRole('link', { name: 'Edit details' })).toHaveCount(0);

	// Preferences: Appearance, which saves as you tap.
	await page.getByRole('link', { name: /Preferences/ }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Preferences');
	await expect(page.getByRole('radiogroup', { name: 'Light or dark' })).toBeVisible();
	await page.getByRole('link', { name: 'You & friends' }).click();

	// Details and account: the private half saves without touching the nickname.
	await page.getByRole('link', { name: /Details and account/ }).click();
	await expect(page.getByLabel('Nickname')).toHaveCount(0);
	await page.getByLabel('Pronouns').fill('he/him');
	await page.getByLabel('Date of birth').fill('1990-05-14');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page).toHaveURL(/\/profile$/);
	const nickname = await page
		.locator('.profile-header h1, .profile-header .name')
		.first()
		.textContent();
	expect(nickname?.trim()).toBeTruthy();
	// Pronouns are private: not on your card.
	await expect(page.locator('.profile-header')).not.toContainText('he/him');
	await page.getByRole('link', { name: /Details and account/ }).click();
	await expect(page.getByLabel('Pronouns')).toHaveValue('he/him');

	// Old addresses land on the new pages.
	await open(page, '/home/profile');
	await expect(page).toHaveURL(/\/profile\/details$/);
	await open(page, '/profile/public');
	await expect(page).toHaveURL(/\/profile\/edit$/);
	expect(errors).toEqual([]);
});

test('Display preferences: glow, steady placeholders, summary, cards shown and a list', async ({
	page
}) => {
	const errors = watchErrors(page);
	const reset = () =>
		page.request.post('/account/display', { data: { prefs: {} } }).then((r) => r.ok());
	expect(await reset()).toBe(true);

	// As designed until you change something.
	await open(page, '/');
	await expect(page.locator('html')).toHaveAttribute('data-glow', 'full');
	await expect(page.locator('.week')).toHaveCount(1);
	const allCards = await page.locator('.coming-up .slide:not(.slide-more)').count();
	expect(allCards).toBeGreaterThan(3);

	// Each change shows at once, without a reload.
	await open(page, '/profile/preferences');
	// Taps where a person would: the row of a switch, the segment of a choice.
	const row = (name: string) => page.locator('.switch-row', { hasText: name });
	const segment = (name: string) => page.locator('.segmented label', { hasText: name });
	await row('Reduce glow effects').click();
	await expect(page.locator('html')).toHaveAttribute('data-glow', 'low');
	await row('Steady placeholders').click();
	await row('Daily summary').click();
	await expect(page.getByRole('switch', { name: 'Daily summary' })).not.toBeChecked();
	await segment('3').click();
	await expect(page.getByRole('radio', { name: '3', exact: true })).toBeChecked();
	await page.locator('.tab-bar a', { hasText: 'Today' }).first().click();
	await expect(page.locator('.week')).toHaveCount(0);
	await expect(page.locator('.coming-up .slide:not(.slide-more)')).toHaveCount(3);
	const more = page.getByRole('button', { name: `Show ${allCards - 3} more` });
	await expect(more).toBeVisible();

	// Nothing is lost: Show N more brings back every card, in the same order.
	await more.click();
	await expect(page.locator('.coming-up .slide:not(.slide-more)')).toHaveCount(allCards);

	// The compact list: the same items and their ticks; it stays after a full reload.
	await open(page, '/profile/preferences');
	await page.locator('.segmented label', { hasText: 'List' }).click();
	await page.waitForTimeout(800); // the save waits a moment for more taps
	await open(page, '/');
	await expect(page.locator('html')).toHaveAttribute('data-glow', 'low');
	await expect(page.locator('.coming-list > li')).toHaveCount(3);
	await expect(page.locator('.coming-list')).toContainText('Put the bins out');
	await expect(page.getByRole('button', { name: /Tick off Put the bins out/ })).toBeVisible();
	await page.getByRole('button', { name: /^Show \d+ more$/ }).click();
	await expect(page.locator('.coming-list > li')).toHaveCount(allCards);

	// Steady placeholders: the hint on a new plan stays put.
	await open(page, '/plans/new');
	const reel = page.locator('.placeholder-reel').first();
	const before = await reel.textContent();
	await page.waitForTimeout(4500);
	expect(await reel.textContent()).toBe(before);

	expect(await reset()).toBe(true);
	expect(errors).toEqual([]);
});

test('Shop for dinners: the week’s dinners, merged, onto Shopping', async ({ page }) => {
	const errors = watchErrors(page);
	await open(page, '/lists');
	await page.getByRole('link', { name: /Shop for this week’s dinners/ }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Shop for dinners');

	// Both sample dinners, ticked; garlic is needed by both, so it's one line.
	await expect(page.locator('input[name="dinner"]:checked')).toHaveCount(2);
	const garlic = page.locator('.tick-row', { hasText: 'Garlic' });
	await expect(garlic).toHaveCount(1);
	await expect(garlic).toContainText('For 2 dinners');
	// To taste and pantry things start unticked, in their own group.
	await expect(page.locator('#got-heading')).toBeVisible();
	await expect(page.locator('.tick-row', { hasText: 'Salt' }).locator('input')).not.toBeChecked();

	// Untick a dinner and its things leave the list.
	const before = await page.locator('input[name="need"]').count();
	await page.locator('.tick-row', { hasText: 'Lemon and herb' }).click();
	await expect(page.locator('input[name="need"]')).not.toHaveCount(before);
	await page.locator('.tick-row', { hasText: 'Lemon and herb' }).click();
	await expect(page.locator('input[name="need"]')).toHaveCount(before);

	// Add: everything ticked goes on Shopping, and you land on it.
	const add = page.locator('.shop-act');
	const count = Number((await add.textContent())?.match(/\d+/)?.[0]);
	expect(count).toBeGreaterThan(5);
	await add.click();
	await expect(page).toHaveURL(/\/lists\/(?!dinners)/);
	await expect(page.getByText(/Garlic · /)).toBeVisible();

	// Back again: what's now on the list starts unticked, as already on Shopping.
	await open(page, '/lists/dinners');
	await expect(page.locator('.tick-row', { hasText: 'Garlic' })).toContainText(
		'Already on Shopping'
	);
	expect(errors).toEqual([]);
});

test('Recurring bills: repeat an expense, see it under Repeats, pause and stop it', async ({
	page
}) => {
	const errors = watchErrors(page);
	await open(page, '/money/sample-group-place/expenses/new');
	await page.locator('#expense-amount').fill('24.99');
	await page.locator('input[name="description"]').fill(`Streaming ${run}`);
	// Repeats are behind their chip, with the category and the day.
	await expect(page.locator('label[for="expense-pick-date"]')).toContainText('Today');
	await page.locator('label[for="expense-pick-repeat"]').click();
	await page.locator('label.choice-pill', { hasText: 'Monthly' }).click();
	await expect(page.getByText(/Adds itself every month from this date/)).toBeVisible();
	await page.locator('.expense-form button.button-primary').click();
	await expect(page).toHaveURL(/\/money\/sample-group-place$/);

	const bill = page.locator('.repeats .grouped-row', { hasText: `Streaming ${run}` });
	await expect(bill).toContainText('Monthly · next');
	await expect(bill).toContainText('$24.99');
	// This month's is in the activity, marked as a recurring bill.
	await expect(
		page.locator('.row', { hasText: `Streaming ${run}` }).getByLabel('Recurring bill')
	).toBeVisible();

	await bill.click();
	await page.getByRole('button', { name: 'Pause' }).click();
	await expect(page.getByText(/Paused\. It won’t add itself/)).toBeVisible();
	await page.getByRole('button', { name: 'Resume' }).click();
	await expect(page.getByText(/Monthly\. Next on/)).toBeVisible();
	// Two taps, like every delete.
	await page.getByRole('button', { name: 'Stop repeating' }).click();
	await page.getByRole('button', { name: 'Tap again to stop it' }).click();
	await expect(page).toHaveURL(/\/money\/sample-group-place$/);
	await expect(page.locator('.repeats .grouped-row', { hasText: `Streaming ${run}` })).toHaveCount(
		0
	);
	expect(errors).toEqual([]);
});

test('Settle-up nudge and the snow globe, from Preferences', async ({ page }) => {
	const errors = watchErrors(page);
	expect((await page.request.post('/account/display', { data: { prefs: {} } })).ok()).toBe(true);

	// Off by default: no nudge, even when you owe something.
	await open(page, '/');
	await expect(page.locator('.nudge')).toHaveCount(0);

	// Snow globe: switching it on shows a few seconds of snow, with a Shake button.
	await open(page, '/profile/preferences');
	await page.locator('.switch-row', { hasText: 'Snow globe' }).click();
	await expect(page.locator('canvas.snow')).toHaveCount(1);
	await page.getByRole('button', { name: /Shake it/ }).click();
	await page.locator('.switch-row', { hasText: 'Snow globe' }).click();
	await expect(page.locator('canvas.snow')).toHaveCount(0);

	// Choosing a nudge amount saves; Today shows it once you're that far behind.
	await page.locator('.segmented label', { hasText: /^\s*\$50\s*$/ }).click();
	await expect(page.getByRole('radio', { name: '$50', exact: true })).toBeChecked();
	await page.waitForTimeout(800);
	await open(page, '/');
	const nudge = page.locator('.nudge');
	if (await nudge.count()) {
		await expect(nudge).toContainText('behind');
		await nudge.getByRole('button', { name: 'Not now' }).click();
		await expect(nudge).toHaveCount(0);
	}

	expect((await page.request.post('/account/display', { data: { prefs: {} } })).ok()).toBe(true);
	expect(errors).toEqual([]);
});

test('Friend requests: a dot on Home, accept one, send by code, send from a profile, cancel', async ({
	page
}) => {
	const errors = watchErrors(page);

	// Jo asked to be friends: a dot on the Home tab, and the request at the top of your profile.
	await open(page, '/home');
	const jo = page.locator('.request', { hasText: 'Jo' });
	if (await page.getByRole('img', { name: /friend request/ }).count()) {
		await page
			.getByRole('link', { name: /^You & friends/ })
			.first()
			.click();
		await expect(jo).toContainText('The Terrace');
		await jo.getByRole('button', { name: 'Accept' }).click();
		await expect(page.locator('.friend', { hasText: 'Jo' })).toBeVisible();
		await expect(page.getByRole('img', { name: /friend request/ })).toHaveCount(0);
	}

	// Their code, typed loosely: lower case, no dash.
	await open(page, '/profile');
	await expect(page.locator('.code')).toHaveText(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
	await page.getByLabel('Their friend code').fill('nope');
	await page.getByRole('button', { name: 'Send request' }).click();
	await expect(page.getByRole('alert')).toContainText('six letters and numbers');
	await page.getByLabel('Their friend code').fill('alx7kp');
	await page.getByRole('button', { name: 'Send request' }).click();
	// Alex may be a friend already (the plan invites journey can add him): then it says so.
	const status = page.getByRole('status');
	await expect(status).toContainText(/Request sent to Alex|You and Alex are friends now/);
	if ((await status.textContent())?.includes('Request sent')) {
		// Requests you've sent are under Manage friends.
		await page.getByRole('link', { name: /Manage friends/ }).click();
		const sent = page.locator('.grouped-row', { hasText: 'Waiting for them to answer' });
		await expect(sent).toContainText('Alex');
		await sent.getByRole('button', { name: 'Cancel' }).click();
		await expect(sent).toHaveCount(0);

		// From Alex's public profile: send, then cancel.
		await open(page, '/people/sample-alex');
		await page.getByRole('button', { name: 'Send friend request' }).click();
		await expect(
			page.getByText('Request sent. You’ll be friends once Alex accepts.')
		).toBeVisible();
		await page.getByRole('button', { name: 'Cancel request' }).click();
		await expect(page.getByRole('button', { name: 'Send friend request' })).toBeVisible();
	}

	// A new code replaces the old one.
	await open(page, '/profile');
	const before = await page.locator('.code').textContent();
	await page.getByRole('button', { name: 'New code' }).click();
	await expect(page.locator('.code')).not.toHaveText(before ?? '');
	expect(errors).toEqual([]);
});

test('Recipe photos: add one to a library recipe, see it in the list, then remove it', async ({
	page
}) => {
	const errors = watchErrors(page);
	const photo = {
		name: 'dish.jpg',
		mimeType: 'image/jpeg',
		buffer: Buffer.from(
			'/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAAwAEADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDWooor5U9oKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/2Q==',
			'base64'
		)
	};
	await open(page, '/dinner/recipe_003');
	await expect(page.locator('.hero')).toHaveCount(0);
	// The camera button opens the phone's own picker; the photo saves as soon as it's picked.
	await page.locator('.header-tools input[type="file"]').setInputFiles(photo);
	await expect(page.locator('.hero img')).toBeVisible();

	await open(page, '/dinner');
	const row = page.locator('.recipe-row[href="/dinner/recipe_003"]');
	await expect(row.locator('img.thumb')).toBeVisible();

	await row.click();
	await page.getByRole('button', { name: 'Photo', exact: true }).click();
	await page.getByRole('button', { name: 'Remove photo' }).click();
	await page.getByRole('button', { name: 'Tap again to remove it' }).click();
	await expect(page.locator('.hero')).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('Add expense: the category guesses itself until you pick one, and Save stays in reach', async ({
	page
}) => {
	const errors = watchErrors(page);
	await open(page, '/money/sample-group-place/expenses/new');
	const chip = page.locator('label[for="expense-pick-category"]');
	await page.locator('input[name="description"]').fill('Opal top up');
	await expect(chip).toContainText('Transport');
	await page.locator('input[name="description"]').fill('Dumplings in Haymarket');
	await expect(chip).toContainText('Eating out');
	// Pick one yourself and it stays put.
	await chip.click();
	await page.locator('label.choice-pill', { hasText: 'Other' }).click();
	await page.locator('input[name="description"]').fill('Uber Eats');
	await expect(page.locator('input[name="category"][value="other"]')).toBeChecked();
	// The save button is docked, on screen without scrolling.
	await expect(page.locator('.expense-form button.button-primary')).toBeInViewport();
	expect(errors).toEqual([]);
});

test('Notifications: what’s new on Home, the full list, and turning them on for this phone', async ({
	page
}) => {
	const errors = watchErrors(page);
	await open(page, '/home');
	const centre = page.locator('section', {
		has: page.getByRole('heading', { name: 'What’s new' })
	});
	await expect(centre.getByText('Chris loved your post')).toBeVisible();
	await expect(centre.getByRole('button', { name: 'Accept' })).toBeVisible();

	await centre.getByRole('link', { name: 'See all' }).click();
	await expect(page.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible();
	await expect(page.getByText('Chris added Groceries')).toBeVisible();

	// Tapping one goes where it's about.
	await page.getByText('Chris added Groceries').click();
	await expect(page).toHaveURL(/\/money\/sample-group-place/);

	await open(page, '/profile/preferences');
	await page.getByRole('button', { name: 'Turn on notifications' }).click();
	await expect(page.getByRole('switch', { name: /Money/ })).toBeChecked();
	await page.getByText('Quiet hours').click();
	await expect(page.getByRole('combobox').first()).toHaveValue('22');
	await page.getByRole('button', { name: 'Turn off on this phone' }).click();
	await expect(page.getByRole('button', { name: 'Turn on notifications' })).toBeVisible();
	expect(errors).toEqual([]);
});
