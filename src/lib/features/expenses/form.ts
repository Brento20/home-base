import { todayISO } from '#lib/time.js';
import type { Expense } from '#lib/types.js';
import type { CategoryKey } from './categories.js';
import type { Share, SplitMethod } from './split.js';

/**
 * The expense form's values. Kept apart from expenses.server.ts so the form component, which runs
 * in the browser, can share these types and starting values.
 */

/** What the expense form sends back, kept as typed so it can be shown again with errors. */
export interface ExpenseFormValues {
	description: string;
	amount: string;
	spentOn: string;
	category: CategoryKey;
	paidBy: string;
	splitMethod: SplitMethod;
	included: string[];
	/** Per person, as typed: dollars for exact amounts, or a percentage. */
	inputs: Record<string, string>;
}

export type ExpenseField = 'description' | 'amount' | 'spentOn' | 'paidBy' | 'split';

export interface ExpenseInput {
	description: string;
	amountCents: number;
	spentOn: string;
	category: CategoryKey;
	paidBy: string;
	splitMethod: SplitMethod;
	shares: Share[];
}

/** The form's starting values for an existing expense, or a new one paid by you and split equally. */
export function expenseFormValues(
	memberIds: string[],
	me: string,
	expense?: Expense
): ExpenseFormValues {
	if (!expense)
		return {
			description: '',
			amount: '',
			spentOn: todayISO(),
			category: 'groceries',
			paidBy: me,
			splitMethod: 'equal',
			included: memberIds,
			inputs: {}
		};

	const inputs: Record<string, string> = {};
	for (const share of expense.shares) {
		if (share.input === null) continue;
		inputs[share.profileId] =
			expense.splitMethod === 'exact' ? (share.input / 100).toFixed(2) : String(share.input);
	}
	return {
		description: expense.description,
		amount: (expense.amountCents / 100).toFixed(2),
		spentOn: expense.spentOn,
		category: expense.category,
		paidBy: expense.paidBy,
		splitMethod: expense.splitMethod,
		included: expense.shares.map((share) => share.profileId),
		inputs
	};
}
