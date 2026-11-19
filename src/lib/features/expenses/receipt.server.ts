/**
 * Receipt scan for Add expense: a photo of a receipt → the total, what it was, the day and a
 * category, filled into the form for a person to check and save. Who paid and the split start as
 * they always do (you, split equally). Null when it can't be read; the form stays empty.
 */
import { askForJson, imageBlock, textBlock, todayForPrompt } from '#lib/server/ai.js';
import { isValidDateISO } from '#lib/time.js';
import { CATEGORIES, type CategoryKey } from './categories.js';
import type { ExpenseFormValues } from './form.js';

interface AiReceipt {
	isReceipt: boolean;
	description: string;
	total: number;
	date: string;
	category: CategoryKey;
}

export async function readReceipt(
	photo: FormDataEntryValue | null,
	start: ExpenseFormValues,
	today: string
): Promise<ExpenseFormValues | null> {
	const image = await imageBlock(photo);
	if (!image) return null;

	const answer = await askForJson<AiReceipt>({
		model: 'sharp',
		system: `You read receipts for a household's shared expenses. Australian dollars.
Today is ${todayForPrompt(today)}.
- isReceipt: false if the photo isn't a receipt, bill or invoice, or the total can't be read.
- description: short and plain, the shop and what it was, e.g. "Woolworths groceries" or "AGL electricity bill".
- total: the final amount paid, including GST, as a number like 84.95.
- date: the purchase date as YYYY-MM-DD, or "" if it isn't shown.
- category: the best fit from the list.`,
		content: [image, textBlock('Read this receipt.')],
		schema: {
			type: 'object',
			additionalProperties: false,
			required: ['isReceipt', 'description', 'total', 'date', 'category'],
			properties: {
				isReceipt: { type: 'boolean' },
				description: { type: 'string' },
				total: { type: 'number' },
				date: { type: 'string' },
				category: { type: 'string', enum: CATEGORIES.map((category) => category.key) }
			}
		},
		maxTokens: 300,
		timeoutMs: 40_000
	});
	if (!answer?.isReceipt || !(answer.total > 0) || answer.total > 1_000_000) return null;

	return {
		...start,
		description: answer.description.trim().slice(0, 120),
		amount: answer.total.toFixed(2),
		// A future date is a misread; keep today's.
		spentOn: isValidDateISO(answer.date) && answer.date <= today ? answer.date : start.spentOn,
		category: answer.category
	};
}
