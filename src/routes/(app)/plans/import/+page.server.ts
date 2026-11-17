import { fail } from '@sveltejs/kit';
import {
	parseCalendarFile,
	RECURRING_WINDOW_DAYS
} from '#lib/features/plans/calendar-import.server.js';
import { importPlans } from '#lib/features/plans/plans.server.js';
import type { Actions, PageServerLoad } from './$types';

const MAX_BYTES = 5 * 1024 * 1024;

export const load: PageServerLoad = () => ({ recurringWindowDays: RECURRING_WINDOW_DAYS });

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const file = (await request.formData()).get('calendar');
		if (!(file instanceof File) || file.size === 0)
			return fail(400, { message: 'Choose an .ics file first.' });
		if (file.size > MAX_BYTES) return fail(400, { message: 'That file is over 5 MB.' });

		let parsed;
		try {
			parsed = parseCalendarFile(await file.text());
		} catch {
			return fail(400, {
				message: 'That doesn’t look like a calendar file. Export it from Calendar as .ics.'
			});
		}

		const { added, alreadyHere } = await importPlans(locals, parsed.plans);
		return {
			imported: {
				calendarName: parsed.calendarName,
				added,
				alreadyHere,
				found: parsed.plans.length
			}
		};
	}
};
