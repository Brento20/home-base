import { error } from '@sveltejs/kit';
import { getHouseholdId, myId } from '#lib/features/household/household.server.js';
import {
	completeTask,
	deleteTask,
	TASK_COLUMNS,
	toTask
} from '#lib/features/tasks/tasks.server.js';
import { dbError } from '#lib/server/db.js';
import { sampleCheckins, sampleTasks } from '#lib/server/sample-data.js';
import { addDays, isValidDateISO, isValidTime, todayISO, zonedToInstant } from '#lib/time.js';
import type { FieldErrors, Profile, Task } from '#lib/types.js';
import {
	cookTitle,
	DEFAULT_DINNER_TIME,
	scaleIngredients,
	type DinnerSnapshot,
	type Recipe
} from './recipe.js';

/**
 * Scheduled dinners. A dinner is a task with a recipe: who's cooking is the assignee, and it
 * carries the recipe as scheduled (scaled to its servings) so it reads the same if the recipe
 * changes. Here: scheduling, moving, cooking and skipping a dinner, the one card Plan dinner
 * opens with ("How was it?" / "Did you make it?"), and who has answered it.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ScheduleInput {
	dueOn: string;
	dueTime: string | null;
	assigneeId: string | null;
}

type ScheduleField = 'dueOn' | 'dueTime' | 'assigneeId';

/** Reads the schedule sheet: a day (or a picked date), an optional time and who's cooking. */
export function parseScheduleForm(form: FormData, members: Profile[], today = todayISO()) {
	const values = {
		day: String(form.get('day') ?? ''),
		otherDate: String(form.get('otherDate') ?? ''),
		dueTime: String(form.get('dueTime') ?? ''),
		assigneeId: String(form.get('assigneeId') ?? '')
	};
	const errors: FieldErrors<ScheduleField> = {};

	const dueOn = values.day === 'other' ? values.otherDate : values.day;
	if (!isValidDateISO(dueOn)) errors.dueOn = 'Pick a day.';
	else if (dueOn < addDays(today, -1)) errors.dueOn = 'That day’s been and gone.';

	const dueTime = values.dueTime || null;
	if (dueTime && !isValidTime(dueTime)) errors.dueTime = 'That time doesn’t look right.';

	const assigneeId = values.assigneeId || null;
	if (assigneeId && !members.some((member) => member.id === assigneeId))
		errors.assigneeId = 'Pick someone in the household.';

	const input: ScheduleInput = { dueOn, dueTime, assigneeId };
	return { input, errors, values, valid: Object.keys(errors).length === 0 };
}

/** Schedules a recipe: a task carrying the recipe as it is now, scaled to the servings. */
export async function scheduleDinner(
	locals: App.Locals,
	recipe: Recipe,
	servings: number,
	input: ScheduleInput
): Promise<string> {
	const snapshot: DinnerSnapshot = {
		title: recipe.title,
		servings,
		ingredients: scaleIngredients(recipe, servings),
		steps: recipe.steps
	};
	const { supabase } = locals;
	if (!supabase) {
		const id = crypto.randomUUID();
		sampleTasks.push({
			id,
			title: cookTitle(recipe.title),
			notes: '',
			assigneeId: input.assigneeId,
			dueOn: input.dueOn,
			dueTime: input.dueTime,
			repeat: 'none',
			completedAt: null,
			completedBy: null,
			createdBy: myId(locals),
			recipeId: recipe.id,
			servings,
			recipe: snapshot
		});
		return id;
	}

	const householdId = await getHouseholdId(locals);
	const { data, error: insertError } = await supabase
		.from('tasks')
		.insert({
			household_id: householdId,
			title: cookTitle(recipe.title),
			assignee_id: input.assigneeId,
			due_on: input.dueOn,
			due_time: input.dueTime,
			recipe_id: recipe.id,
			servings,
			recipe: snapshot
		})
		.select('id')
		.single();
	if (insertError) dbError(insertError);
	return data.id;
}

/** A dinner task (404 for anything else). */
export async function getDinner(locals: App.Locals, taskId: string): Promise<Task> {
	const { supabase } = locals;
	let task: Task | undefined;
	if (!supabase) {
		task = sampleTasks.find((entry) => entry.id === taskId);
	} else if (UUID.test(taskId)) {
		const { data, error: readError } = await supabase
			.from('tasks')
			.select(TASK_COLUMNS)
			.eq('id', taskId)
			.maybeSingle();
		if (readError) dbError(readError);
		if (data) task = toTask(data);
	}
	if (!task?.recipe) error(404, 'That dinner isn’t on the calendar any more.');
	return task;
}

/** Moves a dinner to another day or time, or changes who's cooking. */
export async function rescheduleDinner(locals: App.Locals, taskId: string, input: ScheduleInput) {
	await getDinner(locals, taskId);
	const { supabase } = locals;
	if (!supabase) {
		const task = sampleTasks.find((entry) => entry.id === taskId)!;
		Object.assign(task, input, { completedAt: null, completedBy: null });
		return;
	}

	const { error: updateError } = await supabase
		.from('tasks')
		.update({
			due_on: input.dueOn,
			due_time: input.dueTime,
			assignee_id: input.assigneeId,
			completed_at: null
		})
		.eq('id', taskId);
	if (updateError) dbError(updateError);
}

/** Dinner's done: ticks the task off (it earns a point, like any chore). */
export async function markCooked(locals: App.Locals, taskId: string) {
	await getDinner(locals, taskId);
	await completeTask(locals, taskId);
}

/** Not happening after all: the dinner comes off the calendar. */
export async function skipDinner(locals: App.Locals, taskId: string) {
	await getDinner(locals, taskId);
	await deleteTask(locals, taskId);
}

/** How long after the dinner's time before we ask whether it happened. */
const GRACE_MS = 60 * 60_000;
/** Dinners older than this are left alone. */
const LOOKBACK_DAYS = 10;

export interface DinnerPrompt {
	/** 'rate': cooked, so ask how it was. 'confirm': its time passed and it's still open. */
	kind: 'rate' | 'confirm';
	task: Task;
	/** Your current stars for the recipe, if you've rated it before. */
	stars: number | null;
}

export function dinnerTimePassed(task: Task, now = new Date()) {
	if (!task.dueOn) return false;
	const at = zonedToInstant(task.dueOn, task.dueTime ?? DEFAULT_DINNER_TIME).getTime();
	return now.getTime() >= at + GRACE_MS;
}

/**
 * The one card Plan dinner opens with, if any. A dinner that's been cooked asks you how it
 * was (once per person per dinner). A dinner whose time has passed but is still open asks
 * whether you made it first, so a dinner that moved to Thursday isn't rated on Wednesday.
 * The most recent dinner wins.
 */
export async function getDinnerPrompt(
	locals: App.Locals,
	myStars: Record<string, number>,
	now = new Date()
): Promise<DinnerPrompt | null> {
	const me = myId(locals);
	const since = addDays(todayISO(now), -LOOKBACK_DAYS);
	const { supabase } = locals;

	let dinners: Task[];
	let answered: Set<string>;
	if (!supabase) {
		dinners = sampleTasks.filter((task) => task.recipe && task.dueOn && task.dueOn >= since);
		answered = new Set(
			dinners.filter((task) => sampleCheckins.has(`${task.id}:${me}`)).map((task) => task.id)
		);
	} else {
		const householdId = await getHouseholdId(locals);
		const { data, error: readError } = await supabase
			.from('tasks')
			.select(TASK_COLUMNS)
			.eq('household_id', householdId)
			.not('recipe_id', 'is', null)
			.gte('due_on', since);
		if (readError) dbError(readError);
		dinners = (data ?? []).map(toTask);

		const ids = dinners.filter((task) => task.completedAt).map((task) => task.id);
		answered = new Set();
		if (ids.length) {
			const { data: rows, error: checkinError } = await supabase
				.from('dinner_checkins')
				.select('task_id')
				.eq('profile_id', me)
				.in('task_id', ids);
			if (checkinError) dbError(checkinError);
			for (const row of rows ?? []) answered.add(row.task_id);
		}
	}

	const candidates = dinners
		.map((task): DinnerPrompt | null => {
			if (task.completedAt)
				return answered.has(task.id)
					? null
					: { kind: 'rate', task, stars: myStars[task.recipeId!] ?? null };
			return dinnerTimePassed(task, now) ? { kind: 'confirm', task, stars: null } : null;
		})
		.filter((prompt): prompt is DinnerPrompt => prompt !== null)
		.sort((a, b) =>
			`${b.task.dueOn} ${b.task.dueTime ?? DEFAULT_DINNER_TIME}`.localeCompare(
				`${a.task.dueOn} ${a.task.dueTime ?? DEFAULT_DINNER_TIME}`
			)
		);
	return candidates[0] ?? null;
}

// Check-ins -----------------------------------------------------------------------------------

/**
 * Records that you've answered (or waved off) "How was it?" for a dinner, and for any other
 * cooked dinner of the same recipe still waiting, so the same dish isn't asked about twice.
 */
export async function checkIn(locals: App.Locals, taskId: string) {
	const task = await getDinner(locals, taskId);
	await checkInRecipe(locals, task.recipeId!, taskId);
}

/** Marks every recent cooked dinner of a recipe as answered by you (rating it does this too). */
export async function checkInRecipe(
	locals: App.Locals,
	recipeId: string,
	alsoTaskId: string | null = null
) {
	const me = myId(locals);
	const since = addDays(todayISO(), -LOOKBACK_DAYS);
	const { supabase } = locals;
	if (!supabase) {
		for (const dinner of sampleTasks) {
			if (
				dinner.recipeId === recipeId &&
				dinner.completedAt &&
				dinner.dueOn &&
				dinner.dueOn >= since
			)
				sampleCheckins.add(`${dinner.id}:${me}`);
		}
		if (alsoTaskId) sampleCheckins.add(`${alsoTaskId}:${me}`);
		return;
	}

	const { data, error: readError } = await supabase
		.from('tasks')
		.select('id')
		.eq('household_id', await getHouseholdId(locals))
		.eq('recipe_id', recipeId)
		.not('completed_at', 'is', null)
		.gte('due_on', since);
	if (readError) dbError(readError);
	const ids = new Set([...(alsoTaskId ? [alsoTaskId] : []), ...(data ?? []).map((row) => row.id)]);
	if (!ids.size) return;
	const { error: insertError } = await supabase.from('dinner_checkins').upsert(
		[...ids].map((id) => ({ task_id: id, profile_id: me })),
		{ onConflict: 'task_id,profile_id', ignoreDuplicates: true }
	);
	if (insertError) dbError(insertError);
}
