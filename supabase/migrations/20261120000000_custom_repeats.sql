-- Chores can also repeat every N days, weeks, months or years, like cleaning the air con filter
-- every 3 months or the smoke alarm batteries every year. They're stored in the same `repeat`
-- column as "every-3-months"; the four originals (none, weekly, fortnightly, monthly) are
-- unchanged, so existing chores carry on as they are.
--
-- Month and year repeats keep their day like monthly does: repeat_day remembers it, so a chore
-- on the 31st lands on the last day of shorter months and goes back to the 31st after.

alter table public.tasks drop constraint tasks_repeat_check;
alter table public.tasks
	add constraint tasks_repeat_check check (
		repeat in ('none', 'weekly', 'fortnightly', 'monthly')
		or repeat ~ '^every-([1-9]|[1-9][0-9])-(days|weeks|months|years)$'
	);

-- The occurrence after `due` for a repeat, without the month-end drift.
create or replace function public.next_occurrence(due date, repeat_kind text, anchor_day integer)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
	every integer;
	unit text;
	months integer;
	target_month date;
begin
	if repeat_kind = 'weekly' then
		return due + 7;
	elsif repeat_kind = 'fortnightly' then
		return due + 14;
	elsif repeat_kind = 'monthly' then
		every := 1;
		unit := 'months';
	else
		every := split_part(repeat_kind, '-', 2)::integer;
		unit := split_part(repeat_kind, '-', 3);
	end if;

	if unit = 'days' then
		return due + every;
	elsif unit = 'weeks' then
		return due + 7 * every;
	end if;

	months := case unit when 'years' then 12 * every else every end;
	-- First day of the target month, then the anchor day or that month's last day.
	target_month := (date_trunc('month', due) + make_interval(months => months))::date;
	return target_month + (
		least(anchor_day, extract(day from target_month + interval '1 month' - interval '1 day')::integer) - 1
	);
end;
$$;

-- As in 20261118000200_more_task_repeats.sql, with month and year repeats keeping their day too.
create or replace function public.complete_task(target_task uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
	done public.tasks;
	today date := (now() at time zone 'Australia/Sydney')::date;
	start date;
	anchor integer;
	next_due date;
	next_id uuid;
begin
	update public.tasks
	set completed_at = now()
	where id = target_task and completed_at is null
	returning * into done;

	if not found or done.repeat = 'none' then
		return null;
	end if;

	start := coalesce(done.due_on, today);
	anchor := coalesce(done.repeat_day, extract(day from start)::integer);

	next_due := public.next_occurrence(start, done.repeat, anchor);
	while next_due <= today loop
		next_due := public.next_occurrence(next_due, done.repeat, anchor);
	end loop;

	insert into public.tasks (
		household_id, title, notes, assignee_id, due_on, repeat, repeat_day, spawned_from
	)
	values (
		done.household_id, done.title, done.notes, done.assignee_id, next_due, done.repeat,
		case when done.repeat = 'monthly' or done.repeat ~ '-(months|years)$' then anchor end,
		done.id
	)
	returning id into next_id;

	return next_id;
end;
$$;
