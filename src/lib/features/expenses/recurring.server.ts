/**
 * Recurring bills on the server: listing a group's, starting one from an expense, changing,
 * pausing and stopping it, and adding the ones that have come due (the database does that in
 * one locked step, migration 20261129000100_recurring_bills.sql). Sample mode does the same
 * with sampleRecurring.
 */
import { error, type Cookies } from '@sveltejs/kit';
import { dbError, friendlyMessage } from '#lib/server/db.js';
import { sampleExpenses, sampleRecurring } from '#lib/server/sample-data.js';
import { todayISO } from '#lib/time.js';
import type { ExpenseInput } from './form.js';
import { isFrequency, nextRecurringDate, type Frequency, type RecurringBill } from './recurring.js';

const COLUMNS =
	'id, group_id, description, amount_cents, paid_by, category, split_method, shares, frequency, start_on, added_count, next_on, paused';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface BillRow {
	id: string;
	group_id: string;
	description: string;
	amount_cents: number;
	paid_by: string;
	category: RecurringBill['category'];
	split_method: RecurringBill['splitMethod'];
	shares: { profile_id: string; owed_cents: number; split_input: number | string | null }[];
	frequency: string;
	start_on: string;
	added_count: number;
	next_on: string;
	paused: boolean;
}

const toBill = (row: BillRow): RecurringBill => ({
	id: row.id,
	groupId: row.group_id,
	description: row.description,
	amountCents: row.amount_cents,
	paidBy: row.paid_by,
	category: row.category,
	splitMethod: row.split_method,
	shares: row.shares.map((share) => ({
		profileId: share.profile_id,
		owedCents: share.owed_cents,
		input: share.split_input === null || share.split_input === '' ? null : Number(share.split_input)
	})),
	frequency: isFrequency(row.frequency) ? row.frequency : 'monthly',
	startOn: row.start_on,
	addedCount: row.added_count,
	nextOn: row.next_on,
	paused: row.paused
});

const sharesJson = (input: ExpenseInput) =>
	input.shares.map((share) => ({
		profile_id: share.profileId,
		owed_cents: share.owedCents,
		split_input: share.input
	}));

/** A group's recurring bills, soonest first (paused ones last). */
export async function listRecurring(locals: App.Locals, groupId: string): Promise<RecurringBill[]> {
	const { supabase } = locals;
	const order = (bills: RecurringBill[]) =>
		bills.sort((a, b) => Number(a.paused) - Number(b.paused) || a.nextOn.localeCompare(b.nextOn));
	if (!supabase) return order(sampleRecurring.filter((bill) => bill.groupId === groupId));
	if (!UUID.test(groupId)) return [];
	const { data, error: readError } = await supabase
		.from('recurring_expenses')
		.select(COLUMNS)
		.eq('group_id', groupId)
		.limit(50);
	if (readError) dbError(readError);
	return order((data ?? []).map((row) => toBill(row as BillRow)));
}

export async function getRecurring(
	locals: App.Locals,
	groupId: string,
	id: string
): Promise<RecurringBill> {
	const bill = (await listRecurring(locals, groupId)).find((entry) => entry.id === id);
	if (!bill) error(404, 'That bill doesn’t repeat any more.');
	return bill;
}

/**
 * Saves `input` as an expense and repeats it from its date. Dates between it and today aren't
 * filled in: just the one typed, then the ones ahead.
 */
export async function startRecurring(
	locals: App.Locals,
	groupId: string,
	input: ExpenseInput,
	frequency: Frequency
): Promise<{ message: string | null }> {
	const { supabase } = locals;
	if (!supabase) {
		const today = todayISO();
		let steps = 1;
		while (nextRecurringDate(input.spentOn, frequency, steps) <= today) steps++;
		const id = crypto.randomUUID();
		sampleRecurring.push({
			id,
			groupId,
			...input,
			frequency,
			startOn: input.spentOn,
			addedCount: steps,
			nextOn: nextRecurringDate(input.spentOn, frequency, steps),
			paused: false
		});
		sampleExpenses.push({
			id: crypto.randomUUID(),
			groupId,
			createdAt: new Date().toISOString(),
			recurringId: id,
			...input
		});
		return { message: null };
	}
	const { error: problem } = await supabase.rpc('start_recurring_expense', {
		target_group: groupId,
		expense_description: input.description,
		expense_amount_cents: input.amountCents,
		expense_paid_by: input.paidBy,
		expense_spent_on: input.spentOn,
		expense_category: input.category,
		expense_split_method: input.splitMethod,
		shares: sharesJson(input),
		bill_frequency: frequency
	});
	return { message: problem ? friendlyMessage(problem) : null };
}

/**
 * Changes what a bill adds and how often, from now on (expenses it already added stay as they
 * were). Its date becomes the next one: it repeats from there.
 */
export async function updateRecurring(
	locals: App.Locals,
	bill: RecurringBill,
	input: ExpenseInput,
	frequency: Frequency
): Promise<{ message: string | null }> {
	const { supabase } = locals;
	if (!supabase) {
		Object.assign(bill, {
			...input,
			frequency,
			startOn: input.spentOn,
			addedCount: 0,
			nextOn: input.spentOn,
			paused: false
		});
		const live = sampleRecurring.find((entry) => entry.id === bill.id);
		if (live && live !== bill) Object.assign(live, bill);
		return { message: null };
	}
	const { error: problem } = await supabase
		.from('recurring_expenses')
		.update({
			description: input.description,
			amount_cents: input.amountCents,
			paid_by: input.paidBy,
			category: input.category,
			split_method: input.splitMethod,
			shares: sharesJson(input),
			frequency,
			start_on: input.spentOn,
			added_count: 0,
			paused: false
		})
		.eq('id', bill.id)
		.eq('group_id', bill.groupId);
	return { message: problem ? friendlyMessage(problem) : null };
}

export async function setRecurringPaused(locals: App.Locals, bill: RecurringBill, paused: boolean) {
	const { supabase } = locals;
	if (!supabase) {
		const live = sampleRecurring.find((entry) => entry.id === bill.id);
		if (live) live.paused = paused;
		return;
	}
	const { error: problem } = await supabase
		.from('recurring_expenses')
		.update({ paused })
		.eq('id', bill.id)
		.eq('group_id', bill.groupId);
	if (problem) dbError(problem);
}

/** Stops a bill repeating. The expenses it already added stay: they happened. */
export async function stopRecurring(locals: App.Locals, bill: RecurringBill) {
	const { supabase } = locals;
	if (!supabase) {
		const index = sampleRecurring.findIndex((entry) => entry.id === bill.id);
		if (index >= 0) sampleRecurring.splice(index, 1);
		return;
	}
	const { error: problem } = await supabase
		.from('recurring_expenses')
		.delete()
		.eq('id', bill.id)
		.eq('group_id', bill.groupId);
	if (problem) dbError(problem);
}

/**
 * The day this phone last added due bills (in the home's time zone). Bills come due by the day,
 * so once a day is enough; the database adds each date only once, whichever phone gets there.
 */
export const BILLS_COOKIE = 'hb_bills';

/**
 * Whether due bills still need adding today from this phone, and if so marks them as done (the
 * cookie is set first so a background run, which can't set cookies, still counts). Opening
 * Today or Money used to write to the database every time, every minute's refresh included.
 */
export function billsDueCheck(cookies: Cookies): boolean {
	const today = todayISO();
	if (cookies.get(BILLS_COOKIE) === today) return false;
	try {
		cookies.set(BILLS_COOKIE, today, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 2 * 86_400
		});
	} catch {
		return false; // Headers already sent: the next load checks.
	}
	return true;
}

/** After a bill changes (paused, restarted, its dates moved): check again on the next open. */
export function forgetBillsCheck(cookies: Cookies) {
	cookies.delete(BILLS_COOKIE, { path: '/' });
}

/**
 * Adds every recurring bill that's come due in your groups. Cheap when nothing is due, so
 * Money and Today call it as they load. Never fails a page: at worst, a bill waits for the
 * next visit.
 */
export async function addDueRecurring(locals: App.Locals): Promise<number> {
	const { supabase } = locals;
	if (!supabase) {
		const today = todayISO();
		let added = 0;
		for (const bill of sampleRecurring) {
			let rounds = 0;
			while (!bill.paused && bill.nextOn <= today && rounds < 24) {
				sampleExpenses.push({
					id: crypto.randomUUID(),
					groupId: bill.groupId,
					description: bill.description,
					amountCents: bill.amountCents,
					paidBy: bill.paidBy,
					spentOn: bill.nextOn,
					category: bill.category,
					splitMethod: bill.splitMethod,
					shares: bill.shares,
					createdAt: new Date().toISOString(),
					recurringId: bill.id
				});
				bill.addedCount += 1;
				bill.nextOn = nextRecurringDate(bill.startOn, bill.frequency, bill.addedCount);
				added += 1;
				rounds += 1;
			}
		}
		return added;
	}
	const { data, error: problem } = await supabase.rpc('add_due_recurring_expenses');
	if (problem) {
		console.error('Adding due bills failed', problem.message);
		return 0;
	}
	return Number(data ?? 0);
}
