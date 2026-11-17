-- Chores can repeat every week, every two weeks or every month.
--
-- Monthly chores keep their day: one due on the 31st lands on the last day of shorter months and
-- goes back to the 31st after, instead of drifting earlier each time. repeat_day remembers that
-- day; it's filled in on the first completion and carried to each next occurrence.

alter table public.tasks drop constraint tasks_repeat_check;
alter table public.tasks
	add constraint tasks_repeat_check check (repeat in ('none', 'weekly', 'fortnightly', 'monthly'));

alter table public.tasks
	add column repeat_day smallint check (repeat_day between 1 and 31);

-- The occurrence after `due` for a repeat, without the month-end drift.
create function public.next_occurrence(due date, repeat_kind text, anchor_day integer)
returns date
language sql
immutable
set search_path = ''
as $$
	select case repeat_kind
		when 'weekly' then due + 7
		when 'fortnightly' then due + 14
		when 'monthly' then (
			-- First day of next month, then the anchor day or that month's last day.
			select first_of_next + (least(anchor_day, extract(day from first_of_next + interval '1 month' - interval '1 day')::integer) - 1)
			from (select (date_trunc('month', due) + interval '1 month')::date as first_of_next) m
		)
	end;
$$;

-- Ticks a task off. A repeating chore also gets its next occurrence: one repeat after it was due,
-- moved forward repeat by repeat until it lands after today. Returns the new task's id, if any.
-- Security invoker, so the caller's row-level security still applies.
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
		case when done.repeat = 'monthly' then anchor end, done.id
	)
	returning id into next_id;

	return next_id;
end;
$$;
