import { isCategory } from '#lib/features/expenses/categories.js';
import { listReportExpenses } from '#lib/features/expenses/expenses.server.js';
import {
	buildReport,
	compareReports,
	isWholeMonth,
	monthRange,
	parseRange,
	shiftMonth,
	type DateRange,
	type ReportExpense
} from '#lib/features/expenses/report.js';
import { addDays, daysBetween, todayISO } from '#lib/time.js';
import type { PageServerLoad } from './$types';

/** The range just before another, the same length (a whole month steps back a whole month). */
function previousRange(range: DateRange): DateRange {
	if (isWholeMonth(range)) return shiftMonth(range, -1);
	const days = daysBetween(range.from, range.to) + 1;
	return { from: addDays(range.from, -days), to: addDays(range.from, -1) };
}

const byNewest = (a: ReportExpense, b: ReportExpense) => b.spentOn.localeCompare(a.spentOn);

/**
 * ?from&to picks the range (the current month by default). ?mode=compare with ?aFrom&aTo&bFrom&bTo
 * compares two ranges (this month against last by default). ?category=groceries opens the
 * expenses behind one category.
 */
export const load: PageServerLoad = async ({ locals, parent, url }) => {
	const { group } = await parent();
	const params = url.searchParams;
	const today = todayISO();
	const category = isCategory(params.get('category') ?? '') ? params.get('category') : null;

	if (params.get('mode') === 'compare') {
		const b = parseRange(params.get('bFrom'), params.get('bTo')) ?? monthRange(today);
		const a = parseRange(params.get('aFrom'), params.get('aTo')) ?? previousRange(b);
		const expenses = await listReportExpenses(
			locals,
			group.id,
			a.from < b.from ? a.from : b.from,
			a.to > b.to ? a.to : b.to
		);
		const inRange = (range: DateRange) =>
			expenses
				.filter((e) => e.spentOn >= range.from && e.spentOn <= range.to)
				.filter((e) => e.category === category)
				.sort(byNewest);

		return {
			mode: 'compare' as const,
			category,
			comparison: compareReports(buildReport(expenses, a), buildReport(expenses, b)),
			drill: category ? { a: inRange(a), b: inRange(b) } : null
		};
	}

	const range = parseRange(params.get('from'), params.get('to')) ?? monthRange(today);
	const expenses = await listReportExpenses(locals, group.id, range.from, range.to);
	const report = buildReport(expenses, range);
	const picked = category ? expenses.filter((e) => e.category === category).sort(byNewest) : null;

	return {
		mode: 'overview' as const,
		category,
		report,
		// Over time follows the picked category, so you can see how one kind of spending moves.
		trend: picked ? buildReport(picked, range).series : report.series,
		drill: picked,
		isCurrentMonth: range.from === monthRange(today).from && isWholeMonth(range)
	};
};
