import { isCategory } from '#lib/features/expenses/categories.js';
import { listReportExpenses } from '#lib/features/expenses/expenses.server.js';
import {
	biggestExpenses,
	buildReport,
	compareReports,
	isWholeMonth,
	monthRange,
	paceOf,
	paidByTotals,
	parseRange,
	previousRange,
	type DateRange,
	type ReportExpense
} from '#lib/features/expenses/report.js';
import { todayISO } from '#lib/time.js';
import type { PageServerLoad } from './$types';

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

		// The running totals side by side, following the picked category if there is one.
		const paceSource = category ? expenses.filter((e) => e.category === category) : expenses;
		return {
			mode: 'compare' as const,
			category,
			comparison: compareReports(buildReport(expenses, a), buildReport(expenses, b)),
			pace: { a: paceOf(paceSource, a, today), b: paceOf(paceSource, b, today) },
			drill: category ? { a: inRange(a), b: inRange(b) } : null
		};
	}

	const range = parseRange(params.get('from'), params.get('to')) ?? monthRange(today);
	// One read covers this range and the one before, for "vs last month" and the pace line.
	const before = previousRange(range);
	const all = await listReportExpenses(locals, group.id, before.from, range.to);
	const expenses = all.filter((e) => e.spentOn >= range.from);
	const report = buildReport(expenses, range);
	const previous = buildReport(all, before);
	const picked = category ? expenses.filter((e) => e.category === category).sort(byNewest) : null;
	// Charts over time follow the picked category, so you can see how one kind of spending moves.
	const focus = category ? all.filter((e) => e.category === category) : all;

	return {
		mode: 'overview' as const,
		category,
		report,
		previous: { range: before, totalCents: previous.totalCents },
		trend: picked ? buildReport(picked, range).series : report.series,
		pace: { now: paceOf(focus, range, today), before: paceOf(focus, before) },
		paidBy: paidByTotals(expenses, range),
		biggest: biggestExpenses(expenses, range),
		drill: picked,
		isCurrentMonth: range.from === monthRange(today).from && isWholeMonth(range),
		today
	};
};
