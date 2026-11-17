-- Points: one for every task you tick off.
-- Scores are counted from tasks.completed_by (set to whoever ticked it), so Undo takes the
-- point back on its own and the totals can never drift from the task history.

create index tasks_completed_by_idx on public.tasks (household_id, completed_by, completed_at)
	where completed_by is not null;

-- This week's and all-time points for each member of a household. Weeks start on Monday,
-- household time. Security invoker, so row-level security limits it to your own household.
create function public.household_scores(target_household uuid)
returns table (profile_id uuid, this_week bigint, all_time bigint)
language sql
stable
security invoker
set search_path = ''
as $$
	select
		m.profile_id,
		count(t.id) filter (
			where t.completed_at >= (date_trunc('week', now() at time zone 'Australia/Sydney') at time zone 'Australia/Sydney')
		) as this_week,
		count(t.id) as all_time
	from public.household_members m
	left join public.tasks t
		on t.household_id = m.household_id
		and t.completed_by = m.profile_id
		and t.completed_at is not null
	where m.household_id = target_household
	group by m.profile_id;
$$;

grant execute on function public.household_scores(uuid) to authenticated;
