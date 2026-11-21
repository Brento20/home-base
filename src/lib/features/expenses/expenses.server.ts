import { error } from '@sveltejs/kit';
import { dbError, friendlyMessage } from '#lib/server/db.js';
import type { PostgrestError } from '@supabase/supabase-js';
import { getHouseholdId } from '#lib/features/household/household.server.js';
import {
	sampleExpenseGroups,
	sampleExpenses,
	sampleProfiles,
	sampleSettlements
} from '#lib/server/sample-data.js';
import { isValidDateISO } from '#lib/time.js';
import type {
	Expense,
	ExpenseActivity,
	ExpenseGroup,
	ExpenseGroupSummary,
	FieldErrors,
	Settlement
} from '#lib/types.js';
import { computeBalances, simplifyDebts, type Balance, type Debt } from './balances.js';
import { isCategory, type CategoryKey } from './categories.js';
import { parseMoney } from './money.js';
import { type ExpenseField, type ExpenseFormValues, type ExpenseInput } from './form.js';
import type { ReportExpense } from './report.js';
import { computeShares, isSplitMethod, readSplitInput, type SplitMethod } from './split.js';

/**
 * Shared expense groups, expenses and repayments. Row-level security keeps each group to its
 * members; the database functions in 20261118000000_expenses.sql create groups and save an
 * expense with its shares in one go.
 */

const GROUP_NAME_MAX = 40;
const DESCRIPTION_MAX = 80;

/** Stops with a friendly error page if the database said no. */
const fail500 = (problem: PostgrestError | null) => {
	if (problem) dbError(problem);
};

// Rows -------------------------------------------------------------------------------------------

interface ExpenseRow {
	id: string;
	group_id: string;
	description: string;
	amount_cents: number;
	paid_by: string;
	spent_on: string;
	category: CategoryKey;
	split_method: SplitMethod;
	created_at: string;
	expense_shares: { profile_id: string; owed_cents: number; split_input: number | null }[];
}

interface SettlementRow {
	id: string;
	group_id: string;
	paid_by: string;
	paid_to: string;
	amount_cents: number;
	paid_on: string;
	created_at: string;
}

const EXPENSE_COLUMNS =
	'id, group_id, description, amount_cents, paid_by, spent_on, category, split_method, created_at, expense_shares ( profile_id, owed_cents, split_input )';
const SETTLEMENT_COLUMNS = 'id, group_id, paid_by, paid_to, amount_cents, paid_on, created_at';

const toExpense = (row: ExpenseRow): Expense => ({
	id: row.id,
	groupId: row.group_id,
	description: row.description,
	amountCents: row.amount_cents,
	paidBy: row.paid_by,
	spentOn: row.spent_on,
	category: row.category,
	splitMethod: row.split_method,
	createdAt: row.created_at,
	shares: row.expense_shares.map((share) => ({
		profileId: share.profile_id,
		owedCents: share.owed_cents,
		input: share.split_input === null ? null : Number(share.split_input)
	}))
});

const toSettlement = (row: SettlementRow): Settlement => ({
	id: row.id,
	groupId: row.group_id,
	paidBy: row.paid_by,
	paidTo: row.paid_to,
	amountCents: row.amount_cents,
	paidOn: row.paid_on,
	createdAt: row.created_at
});

/** The person whose view this is: the signed-in user, or the first sample person. */
const meId = (locals: App.Locals) => locals.user?.id ?? sampleProfiles[0].id;

// Groups -----------------------------------------------------------------------------------------

function sampleGroup(id: string) {
	const group = sampleExpenseGroups.find((entry) => entry.id === id);
	if (!group) error(404, 'That group doesn’t exist, or you’re not in it.');
	return group;
}

function sampleBalances(group: ExpenseGroup): Balance[] {
	return computeBalances(
		group.memberIds,
		sampleExpenses.filter((e) => e.groupId === group.id),
		sampleSettlements.filter((s) => s.groupId === group.id)
	);
}

async function readBalances(locals: App.Locals, group: ExpenseGroup): Promise<Balance[]> {
	if (!locals.supabase) return sampleBalances(group);
	const { data, error: problem } = await locals.supabase.rpc('expense_group_balances', {
		target_group: group.id
	});
	fail500(problem);
	return ((data ?? []) as { profile_id: string; net_cents: number }[]).map((row) => ({
		profileId: row.profile_id,
		netCents: Number(row.net_cents)
	}));
}

/**
 * The groups you're in, with your balance in each. The groups and every balance come back
 * together (household_group_balances), so this is one trip, not one per group after another.
 */
export async function listGroups(locals: App.Locals): Promise<ExpenseGroupSummary[]> {
	const me = meId(locals);
	const summary = (group: ExpenseGroup, balances: Balance[]): ExpenseGroupSummary => ({
		...group,
		myNetCents: balances.find((b) => b.profileId === me)?.netCents ?? 0,
		myDebts: simplifyDebts(balances).filter((debt) => debt.from === me || debt.to === me)
	});

	if (!locals.supabase)
		return sampleExpenseGroups
			.filter((group) => group.memberIds.includes(me))
			.map((group) => summary(group, sampleBalances(group)));

	const [{ data, error: problem }, { data: rows, error: balanceProblem }] = await Promise.all([
		locals.supabase
			.from('expense_groups')
			.select('id, name, expense_group_members ( profile_id )')
			.eq('household_id', await getHouseholdId(locals))
			.order('created_at'),
		locals.supabase.rpc('household_group_balances')
	]);
	fail500(problem);
	fail500(balanceProblem);

	const balancesByGroup = new Map<string, Balance[]>();
	for (const row of (rows ?? []) as { group_id: string; profile_id: string; net_cents: number }[]) {
		const list = balancesByGroup.get(row.group_id) ?? [];
		list.push({ profileId: row.profile_id, netCents: Number(row.net_cents) });
		balancesByGroup.set(row.group_id, list);
	}

	return (data ?? []).map((row) =>
		summary(
			{
				id: row.id,
				name: row.name,
				memberIds: row.expense_group_members.map((m: { profile_id: string }) => m.profile_id)
			},
			balancesByGroup.get(row.id) ?? []
		)
	);
}

export async function getGroup(locals: App.Locals, id: string): Promise<ExpenseGroup> {
	if (!locals.supabase) return sampleGroup(id);

	const { data, error: problem } = await locals.supabase
		.from('expense_groups')
		.select('id, name, expense_group_members ( profile_id, joined_at )')
		.eq('id', id)
		.maybeSingle();
	fail500(problem);
	if (!data) error(404, 'That group doesn’t exist, or you’re not in it.');

	return {
		id: data.id,
		name: data.name,
		memberIds: [...data.expense_group_members]
			.sort((a: { joined_at: string }, b: { joined_at: string }) =>
				a.joined_at.localeCompare(b.joined_at)
			)
			.map((m: { profile_id: string }) => m.profile_id)
	};
}

/** Everyone's balance and the fewest repayments that would settle the group. */
export async function getGroupBalances(
	locals: App.Locals,
	group: ExpenseGroup
): Promise<{ balances: Balance[]; debts: Debt[] }> {
	const balances = await readBalances(locals, group);
	return { balances, debts: simplifyDebts(balances) };
}

export function parseGroupForm(form: FormData, homeMemberIds: string[], me: string) {
	const name = String(form.get('name') ?? '').trim();
	const memberIds = form
		.getAll('members')
		.map(String)
		.filter((id) => homeMemberIds.includes(id) && id !== me);
	const errors: FieldErrors<'name'> = {};
	if (!name) errors.name = 'Give the group a name.';
	else if (name.length > GROUP_NAME_MAX)
		errors.name = `Keep it under ${GROUP_NAME_MAX} characters.`;
	return { name, memberIds, errors, valid: !errors.name };
}

export async function createGroup(
	locals: App.Locals,
	name: string,
	memberIds: string[]
): Promise<{ id: string | null; message: string | null }> {
	if (!locals.supabase) {
		const id = crypto.randomUUID();
		sampleExpenseGroups.push({ id, name, memberIds: [meId(locals), ...memberIds] });
		return { id, message: null };
	}

	const { data, error: problem } = await locals.supabase.rpc('create_expense_group', {
		target_household: await getHouseholdId(locals),
		group_name: name,
		member_ids: memberIds
	});
	if (problem) return { id: null, message: friendlyMessage(problem) };
	return { id: data as string, message: null };
}

export async function renameGroup(locals: App.Locals, id: string, name: string) {
	if (!locals.supabase) {
		sampleGroup(id).name = name;
		return;
	}
	const { error: problem } = await locals.supabase
		.from('expense_groups')
		.update({ name })
		.eq('id', id);
	fail500(problem);
}

export async function addGroupMembers(locals: App.Locals, id: string, memberIds: string[]) {
	if (memberIds.length === 0) return { message: null };
	if (!locals.supabase) {
		const group = sampleGroup(id);
		group.memberIds = [...new Set([...group.memberIds, ...memberIds])];
		return { message: null };
	}
	const { error: problem } = await locals.supabase.rpc('add_expense_group_members', {
		target_group: id,
		member_ids: memberIds
	});
	return { message: problem ? friendlyMessage(problem) : null };
}

// Activity ---------------------------------------------------------------------------------------

/** Expenses and repayments together, newest first. */
export async function listActivity(
	locals: App.Locals,
	groupId: string
): Promise<ExpenseActivity[]> {
	let expenses: Expense[];
	let settlements: Settlement[];

	if (!locals.supabase) {
		expenses = sampleExpenses.filter((e) => e.groupId === groupId);
		settlements = sampleSettlements.filter((s) => s.groupId === groupId);
	} else {
		const [expenseResult, settlementResult] = await Promise.all([
			locals.supabase
				.from('expenses')
				.select(EXPENSE_COLUMNS)
				.eq('group_id', groupId)
				.order('spent_on', { ascending: false })
				.limit(300),
			locals.supabase
				.from('settlements')
				.select(SETTLEMENT_COLUMNS)
				.eq('group_id', groupId)
				.order('paid_on', { ascending: false })
				.limit(300)
		]);
		fail500(expenseResult.error);
		fail500(settlementResult.error);
		expenses = ((expenseResult.data ?? []) as ExpenseRow[]).map(toExpense);
		settlements = ((settlementResult.data ?? []) as SettlementRow[]).map(toSettlement);
	}

	const items: (ExpenseActivity & { createdAt: string })[] = [
		...expenses.map((expense) => ({
			kind: 'expense' as const,
			date: expense.spentOn,
			createdAt: expense.createdAt,
			expense
		})),
		...settlements.map((settlement) => ({
			kind: 'settlement' as const,
			date: settlement.paidOn,
			createdAt: settlement.createdAt,
			settlement
		}))
	];

	return items
		.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
		.map(({ createdAt: _createdAt, ...item }) => item as ExpenseActivity);
}

// Expenses ---------------------------------------------------------------------------------------

export async function getExpense(
	locals: App.Locals,
	groupId: string,
	id: string
): Promise<Expense> {
	if (!locals.supabase) {
		const expense = sampleExpenses.find((e) => e.id === id && e.groupId === groupId);
		if (!expense) error(404, 'That expense doesn’t exist any more.');
		return expense;
	}

	const { data, error: problem } = await locals.supabase
		.from('expenses')
		.select(EXPENSE_COLUMNS)
		.eq('id', id)
		.eq('group_id', groupId)
		.maybeSingle();
	fail500(problem);
	if (!data) error(404, 'That expense doesn’t exist any more.');
	return toExpense(data as ExpenseRow);
}

export function parseExpenseForm(form: FormData, memberIds: string[]) {
	const text = (name: string) => String(form.get(name) ?? '').trim();
	const category = text('category');
	const splitMethod = text('splitMethod');
	const included = form
		.getAll('included')
		.map(String)
		.filter((id) => memberIds.includes(id));
	const inputs: Record<string, string> = {};
	for (const id of memberIds) inputs[id] = text(`input-${id}`);

	const values: ExpenseFormValues = {
		description: text('description'),
		amount: text('amount'),
		spentOn: text('spentOn'),
		category: isCategory(category) ? category : 'other',
		paidBy: text('paidBy'),
		splitMethod: isSplitMethod(splitMethod) ? splitMethod : 'equal',
		included,
		inputs
	};

	const errors: FieldErrors<ExpenseField> = {};
	if (!values.description) errors.description = 'Say what it was for.';
	else if (values.description.length > DESCRIPTION_MAX)
		errors.description = `Keep it under ${DESCRIPTION_MAX} characters.`;

	const amountCents = parseMoney(values.amount);
	if (amountCents === null || amountCents <= 0) errors.amount = 'Enter an amount, like 42.50.';
	if (!isValidDateISO(values.spentOn)) errors.spentOn = 'Pick a date.';
	if (!memberIds.includes(values.paidBy)) errors.paidBy = 'Choose who paid.';

	const entries = included.map((profileId) => {
		const typed = inputs[profileId] ?? '';
		return { profileId, input: readSplitInput(values.splitMethod, typed) };
	});
	const split = computeShares(amountCents ?? 0, values.splitMethod, entries);
	if (!errors.amount && !split.ok) errors.split = split.message;

	const valid = Object.keys(errors).length === 0;
	const input: ExpenseInput | null = valid
		? {
				description: values.description,
				amountCents: amountCents!,
				spentOn: values.spentOn,
				category: values.category,
				paidBy: values.paidBy,
				splitMethod: values.splitMethod,
				shares: split.shares
			}
		: null;

	return { values, errors, input, valid };
}

export async function saveExpense(
	locals: App.Locals,
	groupId: string,
	expenseId: string | null,
	input: ExpenseInput
): Promise<{ message: string | null }> {
	if (!locals.supabase) {
		const existing = expenseId ? await getExpense(locals, groupId, expenseId) : null;
		const saved: Expense = {
			id: existing?.id ?? crypto.randomUUID(),
			groupId,
			createdAt: existing?.createdAt ?? new Date().toISOString(),
			...input,
			shares: input.shares
		};
		if (existing) Object.assign(existing, saved);
		else sampleExpenses.push(saved);
		return { message: null };
	}

	const { error: problem } = await locals.supabase.rpc('save_expense', {
		target_expense: expenseId,
		target_group: groupId,
		expense_description: input.description,
		expense_amount_cents: input.amountCents,
		expense_paid_by: input.paidBy,
		expense_spent_on: input.spentOn,
		expense_category: input.category,
		expense_split_method: input.splitMethod,
		shares: input.shares.map((share) => ({
			profile_id: share.profileId,
			owed_cents: share.owedCents,
			split_input: share.input
		}))
	});
	return { message: problem ? friendlyMessage(problem) : null };
}

export async function deleteExpense(locals: App.Locals, groupId: string, id: string) {
	if (!locals.supabase) {
		const index = sampleExpenses.findIndex((e) => e.id === id && e.groupId === groupId);
		if (index >= 0) sampleExpenses.splice(index, 1);
		return;
	}
	const { error: problem } = await locals.supabase
		.from('expenses')
		.delete()
		.eq('id', id)
		.eq('group_id', groupId);
	fail500(problem);
}

// Settling up ------------------------------------------------------------------------------------

export interface SettlementValues {
	paidBy: string;
	paidTo: string;
	amount: string;
	paidOn: string;
}

export function parseSettlementForm(form: FormData, memberIds: string[]) {
	const text = (name: string) => String(form.get(name) ?? '').trim();
	const values: SettlementValues = {
		paidBy: text('paidBy'),
		paidTo: text('paidTo'),
		amount: text('amount'),
		paidOn: text('paidOn')
	};
	const errors: FieldErrors<'people' | 'amount' | 'paidOn'> = {};
	if (!memberIds.includes(values.paidBy) || !memberIds.includes(values.paidTo))
		errors.people = 'Choose who paid and who got the money.';
	else if (values.paidBy === values.paidTo) errors.people = 'Pick two different people.';
	const amountCents = parseMoney(values.amount);
	if (amountCents === null || amountCents <= 0) errors.amount = 'Enter an amount, like 40.';
	if (!isValidDateISO(values.paidOn)) errors.paidOn = 'Pick a date.';
	return { values, amountCents: amountCents ?? 0, errors, valid: Object.keys(errors).length === 0 };
}

export async function recordSettlement(
	locals: App.Locals,
	groupId: string,
	values: SettlementValues,
	amountCents: number
): Promise<{ message: string | null }> {
	if (!locals.supabase) {
		sampleSettlements.push({
			id: crypto.randomUUID(),
			groupId,
			paidBy: values.paidBy,
			paidTo: values.paidTo,
			amountCents,
			paidOn: values.paidOn,
			createdAt: new Date().toISOString()
		});
		return { message: null };
	}

	const { error: problem } = await locals.supabase.from('settlements').insert({
		group_id: groupId,
		paid_by: values.paidBy,
		paid_to: values.paidTo,
		amount_cents: amountCents,
		paid_on: values.paidOn
	});
	return { message: problem ? friendlyMessage(problem) : null };
}

export async function getSettlement(locals: App.Locals, groupId: string, id: string) {
	if (!locals.supabase) {
		const settlement = sampleSettlements.find((s) => s.id === id && s.groupId === groupId);
		if (!settlement) error(404, 'That repayment doesn’t exist any more.');
		return settlement;
	}
	const { data, error: problem } = await locals.supabase
		.from('settlements')
		.select(SETTLEMENT_COLUMNS)
		.eq('id', id)
		.eq('group_id', groupId)
		.maybeSingle();
	fail500(problem);
	if (!data) error(404, 'That repayment doesn’t exist any more.');
	return toSettlement(data as SettlementRow);
}

export async function deleteSettlement(locals: App.Locals, groupId: string, id: string) {
	if (!locals.supabase) {
		const index = sampleSettlements.findIndex((s) => s.id === id && s.groupId === groupId);
		if (index >= 0) sampleSettlements.splice(index, 1);
		return;
	}
	const { error: problem } = await locals.supabase
		.from('settlements')
		.delete()
		.eq('id', id)
		.eq('group_id', groupId);
	fail500(problem);
}

// Reports ----------------------------------------------------------------------------------------

/** Every expense in a group between two dates (inclusive), for reports. Repayments aren't spending. */
export async function listReportExpenses(
	locals: App.Locals,
	groupId: string,
	from: string,
	to: string
): Promise<ReportExpense[]> {
	if (!locals.supabase)
		return sampleExpenses
			.filter((e) => e.groupId === groupId && e.spentOn >= from && e.spentOn <= to)
			.map(({ id, description, amountCents, category, spentOn, paidBy }) => ({
				id,
				description,
				amountCents,
				category,
				spentOn,
				paidBy
			}));

	const { data, error: problem } = await locals.supabase
		.from('expenses')
		.select('id, description, amount_cents, category, spent_on, paid_by')
		.eq('group_id', groupId)
		.gte('spent_on', from)
		.lte('spent_on', to)
		.order('spent_on', { ascending: false });
	fail500(problem);

	return (data ?? []).map((row) => ({
		id: row.id,
		description: row.description,
		amountCents: row.amount_cents,
		category: row.category,
		spentOn: row.spent_on,
		paidBy: row.paid_by
	}));
}
