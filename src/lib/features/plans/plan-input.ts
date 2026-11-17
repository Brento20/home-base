/** Limits and the write shape for a plan, shared by the form parser and the calendar import. */
export const PLAN_TITLE_MAX = 160;
export const PLAN_NOTES_MAX = 2000;
export const PLAN_LOCATION_MAX = 200;

export interface PlanInput {
	title: string;
	notes: string;
	location: string;
	startsAt: string;
	endsAt: string | null;
	allDay: boolean;
}

export type PlanField = 'title' | 'notes' | 'location' | 'date' | 'startTime' | 'endTime';

/** Form values as the person typed them, for refilling the form after an error. */
export interface PlanFormValues {
	title: string;
	notes: string;
	location: string;
	date: string;
	allDay: boolean;
	startTime: string;
	endTime: string;
}
