-- Everyone's balance in every money group of the caller's home, in one call. Today and the
-- Money tab used to ask once per group (expense_group_balances), after first reading the
-- groups: two trips in a row before the page could show. The sums are the same as
-- expense_group_balances; row-level security (security invoker) keeps it to your home.

create function public.household_group_balances()
returns table (group_id uuid, profile_id uuid, net_cents bigint)
language sql
stable
security invoker
set search_path = ''
as $$
	select m.group_id,
		m.profile_id,
		coalesce((select sum(e.amount_cents) from public.expenses e
			where e.group_id = m.group_id and e.paid_by = m.profile_id), 0)
		- coalesce((select sum(s.owed_cents) from public.expense_shares s
			join public.expenses e on e.id = s.expense_id
			where e.group_id = m.group_id and s.profile_id = m.profile_id), 0)
		+ coalesce((select sum(t.amount_cents) from public.settlements t
			where t.group_id = m.group_id and t.paid_by = m.profile_id), 0)
		- coalesce((select sum(t.amount_cents) from public.settlements t
			where t.group_id = m.group_id and t.paid_to = m.profile_id), 0)
		as net_cents
	from public.expense_group_members m;
$$;

revoke execute on function public.household_group_balances() from public, anon;
grant execute on function public.household_group_balances() to authenticated;
