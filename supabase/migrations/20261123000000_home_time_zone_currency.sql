-- Each home keeps its own time zone and currency (src/lib/home.ts), instead of everyone being in
-- Sydney paying in Australian dollars. Existing homes keep exactly what they had.

-- A real time zone name, as the database knows them.
create function public.is_time_zone(zone text)
returns boolean
language sql
stable
set search_path = ''
as $$
	select exists (select 1 from pg_catalog.pg_timezone_names where name = zone);
$$;

alter table public.households
	add column time_zone text not null default 'Australia/Sydney'
		check (public.is_time_zone(time_zone)),
	add column currency text not null default 'AUD'
		check (currency ~ '^[A-Z]{3}$');

-- The week's points start on Monday where the home is.
create or replace function public.household_scores(target_household uuid)
returns table (profile_id uuid, this_week bigint, all_time bigint)
language sql
stable
security invoker
set search_path = ''
as $$
	with home as (
		select coalesce(
			(select h.time_zone from public.households h where h.id = target_household),
			'Australia/Sydney'
		) as zone
	)
	select
		m.profile_id,
		count(t.id) filter (
			where t.completed_at >= (date_trunc('week', now() at time zone home.zone) at time zone home.zone)
		) as this_week,
		count(t.id) as all_time
	from home, public.household_members m
	left join public.tasks t
		on t.household_id = m.household_id
		and t.completed_by = m.profile_id
		and t.completed_at is not null
	where m.household_id = target_household
	group by m.profile_id;
$$;

-- As in 20261120000000_custom_repeats.sql, with "today" taken where the task's home is.
create or replace function public.complete_task(target_task uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
	done public.tasks;
	zone text := coalesce(
		(
			select h.time_zone
			from public.tasks t
			join public.households h on h.id = t.household_id
			where t.id = target_task
		),
		'Australia/Sydney'
	);
	today date := (now() at time zone zone)::date;
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
