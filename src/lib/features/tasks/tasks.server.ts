import { error } from '@sveltejs/kit';
import { dbError } from '#lib/server/db.js';
import { getHouseholdId } from '#lib/features/household/household.server.js';
import { sampleProfiles, sampleTasks } from '#lib/server/sample-data.js';
import { addDays, isValidDateISO, todayISO } from '#lib/time.js';
import { nextDueDate, repeatFromForm } from './repeat.js';
import type { DinnerSnapshot } from '#lib/features/recipes/recipe.js';
import type { CookDinner, FieldErrors, Profile, Task } from '#lib/types.js';

/**
 * Tasks are household chores: a name, who, when, and optionally a repeat (weekly, every two
 * weeks or monthly). Ticking one off moves it to Past tasks; a repeating chore gets its next
 * occurrence (done in the database by complete_task, so every phone sees the same result).
 */

const TASK_TITLE_MAX = 160;

export interface TaskInput {
	title: string;
	assigneeId: string | null;
	dueOn: string | null;
	repeat: Task['repeat'];
	notes: string;
}

type TaskField = 'title' | 'assigneeId' | 'dueOn' | 'notes';

export const TASK_NOTES_MAX = 2000;

interface TaskRow {
	id: string;
	title: string;
	notes: string;
	assignee_id: string | null;
	due_on: string | null;
	repeat: Task['repeat'];
	completed_at: string | null;
	completed_by: string | null;
	created_by: string | null;
	due_time: string | null;
	recipe_id: string | null;
	servings: number | null;
	/** Only the dish's name, from TASK_COLUMNS... */
	recipe_title?: string | null;
	/** ...or the whole recipe as scheduled, from DINNER_COLUMNS. */
	recipe?: DinnerSnapshot | null;
}

/**
 * A task as lists, Today and the calendar show it: for a dinner, just the dish's name, not the
 * recipe snapshot (ingredients, method, nutrition), which only the cook view needs.
 */
export const TASK_COLUMNS =
	'id, title, notes, assignee_id, due_on, repeat, completed_at, completed_by, created_by, due_time, recipe_id, servings, recipe_title:recipe->>title';
/** A dinner with its whole recipe snapshot, for the cook view (getDinner). */
export const DINNER_COLUMNS = `${TASK_COLUMNS}, recipe`;
const COLUMNS = TASK_COLUMNS;

export const toTask = (row: TaskRow): Task => ({
	id: row.id,
	title: row.title,
	notes: row.notes,
	assigneeId: row.assignee_id,
	dueOn: row.due_on,
	repeat: row.repeat,
	completedAt: row.completed_at,
	completedBy: row.completed_by,
	createdBy: row.created_by,
	dueTime: row.due_time ? row.due_time.slice(0, 5) : null,
	recipeId: row.recipe_id,
	servings: row.servings,
	recipe: row.recipe
		? { title: row.recipe.title }
		: row.recipe_title != null
			? { title: row.recipe_title }
			: null
});

/** A dinner row read with DINNER_COLUMNS, recipe and all. */
export const toCookDinner = (row: TaskRow): CookDinner | null =>
	row.recipe ? { ...toTask(row), recipe: row.recipe } : null;

/** Soonest due first, undated last. */
const byDue = (a: Task, b: Task) => (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999');

/**
 * Reads a task form. Due is either a quick choice (`due` = none | today | tomorrow | date)
 * with `dueDate` for a picked date, or just `dueDate` on the edit page. A repeating chore
 * needs a day to repeat from, so it defaults to today.
 */
export function parseTaskForm(form: FormData, members: Profile[], today = todayISO()) {
	const values = {
		title: String(form.get('title') ?? '').trim(),
		assigneeId: String(form.get('assigneeId') ?? ''),
		due: String(form.get('due') ?? (form.get('dueDate') ? 'date' : 'none')),
		dueDate: String(form.get('dueDate') ?? ''),
		repeat: repeatFromForm(form),
		notes: String(form.get('notes') ?? '').trim()
	};
	const errors: FieldErrors<TaskField> = {};

	if (!values.title) errors.title = 'Give the task a name.';
	else if (values.title.length > TASK_TITLE_MAX)
		errors.title = `Keep it under ${TASK_TITLE_MAX} characters.`;

	if (values.notes.length > TASK_NOTES_MAX)
		errors.notes = `Keep the note under ${TASK_NOTES_MAX} characters.`;

	const assigneeId = values.assigneeId || null;
	if (assigneeId && !members.some((member) => member.id === assigneeId)) {
		errors.assigneeId = 'Pick someone in the household.';
	}

	let dueOn: string | null = null;
	if (values.due === 'today') dueOn = today;
	else if (values.due === 'tomorrow') dueOn = addDays(today, 1);
	else if (values.due === 'date' && values.dueDate) {
		if (isValidDateISO(values.dueDate)) dueOn = values.dueDate;
		else errors.dueOn = 'That date doesn’t look right.';
	}
	const { repeat } = values;
	if (repeat !== 'none' && !dueOn && !errors.dueOn) dueOn = today;

	const input: TaskInput = { title: values.title, assigneeId, dueOn, repeat, notes: values.notes };
	return { input, errors, values, valid: Object.keys(errors).length === 0 };
}

/** Everything still to do. */
export async function listOpenTasks(locals: App.Locals): Promise<Task[]> {
	const { supabase } = locals;
	if (!supabase) return sampleTasks.filter((task) => !task.completedAt).sort(byDue);

	const householdId = await getHouseholdId(locals);
	const { data, error: readError } = await supabase
		.from('tasks')
		.select(COLUMNS)
		.eq('household_id', householdId)
		.is('completed_at', null)
		.order('due_on', { ascending: true, nullsFirst: false })
		.order('created_at');

	if (readError) dbError(readError);
	return (data ?? []).map(toTask);
}

/**
 * Open chores and dinners due within the next week: what Today's slider shows. Overdue chores
 * stay in; a past dinner is asked about in Plan dinner instead ("Did you make it?").
 */
export async function listTasksComingUp(locals: App.Locals, days = 7): Promise<Task[]> {
	const today = todayISO();
	const until = addDays(today, days - 1);
	const due = (task: Task) =>
		task.dueOn !== null && task.dueOn <= until && (!task.recipeId || task.dueOn >= today);

	const { supabase } = locals;
	if (!supabase) return (await listOpenTasks(locals)).filter(due);

	// Only what's due by the end of the week, not every open task in the home: a long list of
	// undated or far-off chores shouldn't make Today slower.
	const { data, error: readError } = await supabase
		.from('tasks')
		.select(COLUMNS)
		.eq('household_id', await getHouseholdId(locals))
		.is('completed_at', null)
		.lte('due_on', until)
		.order('due_on')
		.order('created_at');
	if (readError) dbError(readError);
	return (data ?? []).map(toTask).filter(due);
}

/** Finished tasks, most recent first. */
export async function listPastTasks(locals: App.Locals, limit = 100): Promise<Task[]> {
	const { supabase } = locals;
	if (!supabase) {
		return sampleTasks
			.filter((task) => task.completedAt)
			.sort((a, b) => b.completedAt!.localeCompare(a.completedAt!))
			.slice(0, limit);
	}

	const householdId = await getHouseholdId(locals);
	const { data, error: readError } = await supabase
		.from('tasks')
		.select(COLUMNS)
		.eq('household_id', householdId)
		.not('completed_at', 'is', null)
		.order('completed_at', { ascending: false })
		.limit(limit);

	if (readError) dbError(readError);
	return (data ?? []).map(toTask);
}

export async function getTask(locals: App.Locals, id: string): Promise<Task> {
	const { supabase } = locals;
	if (!supabase) {
		const task = sampleTasks.find((entry) => entry.id === id);
		if (!task) error(404, 'That task doesn’t exist any more.');
		return task;
	}

	const { data, error: readError } = await supabase
		.from('tasks')
		.select(COLUMNS)
		.eq('id', id)
		.maybeSingle();
	if (readError) dbError(readError);
	if (!data) error(404, 'That task doesn’t exist any more.');
	return toTask(data);
}

export async function createTask(locals: App.Locals, input: TaskInput) {
	const { supabase } = locals;
	if (!supabase) {
		sampleTasks.push({
			id: crypto.randomUUID(),
			...input,
			completedAt: null,
			completedBy: null,
			createdBy: sampleProfiles[0].id,
			dueTime: null,
			recipeId: null,
			servings: null,
			recipe: null
		});
		return;
	}

	const householdId = await getHouseholdId(locals);
	const { error: insertError } = await supabase.from('tasks').insert({
		household_id: householdId,
		title: input.title,
		notes: input.notes,
		assignee_id: input.assigneeId,
		due_on: input.dueOn,
		repeat: input.repeat
	});
	if (insertError) dbError(insertError);
}

export async function updateTask(locals: App.Locals, id: string, input: TaskInput) {
	const { supabase } = locals;
	if (!supabase) {
		const task = sampleTasks.find((entry) => entry.id === id);
		if (!task) error(404, 'That task doesn’t exist any more.');
		Object.assign(task, input);
		return;
	}

	const { data, error: updateError } = await supabase
		.from('tasks')
		.update({
			title: input.title,
			notes: input.notes,
			assignee_id: input.assigneeId,
			due_on: input.dueOn,
			repeat: input.repeat,
			// A monthly chore takes its day from the (possibly changed) due date again.
			repeat_day: null
		})
		.eq('id', id)
		.select('id');
	if (updateError) dbError(updateError);
	if (!data?.length) error(404, 'That task doesn’t exist any more.');
}

/** Sample mode's record of which next occurrence each completion created, for Undo. */
const sampleSpawned = new Map<string, string>();

/** Ticks a task off; a repeating chore gets its next occurrence. */
export async function completeTask(locals: App.Locals, id: string) {
	const { supabase } = locals;
	if (!supabase) {
		const task = sampleTasks.find((entry) => entry.id === id);
		if (!task || task.completedAt) return;
		task.completedAt = new Date().toISOString();
		task.completedBy = sampleProfiles[0].id;
		if (task.repeat !== 'none') {
			const next: Task = {
				...task,
				id: crypto.randomUUID(),
				dueOn: nextDueDate(task.dueOn, task.repeat, todayISO()),
				completedAt: null,
				completedBy: null
			};
			sampleTasks.push(next);
			sampleSpawned.set(task.id, next.id);
		}
		return;
	}

	const { error: rpcError } = await supabase.rpc('complete_task', { target_task: id });
	if (rpcError) dbError(rpcError);
}

/** Undoes a tick, taking back the next occurrence if it's still untouched. */
export async function reopenTask(locals: App.Locals, id: string) {
	const { supabase } = locals;
	if (!supabase) {
		const task = sampleTasks.find((entry) => entry.id === id);
		if (!task) return;
		task.completedAt = null;
		task.completedBy = null;
		const spawnedId = sampleSpawned.get(id);
		const spawned = sampleTasks.findIndex((entry) => entry.id === spawnedId && !entry.completedAt);
		if (spawned >= 0) sampleTasks.splice(spawned, 1);
		sampleSpawned.delete(id);
		return;
	}

	const { error: rpcError } = await supabase.rpc('reopen_task', { target_task: id });
	if (rpcError) dbError(rpcError);
}

export async function deleteTask(locals: App.Locals, id: string) {
	const { supabase } = locals;
	if (!supabase) {
		const index = sampleTasks.findIndex((entry) => entry.id === id);
		if (index >= 0) sampleTasks.splice(index, 1);
		return;
	}

	const { error: deleteError } = await supabase.from('tasks').delete().eq('id', id);
	if (deleteError) dbError(deleteError);
}
