-- Every home has one Shopping list that's always there, even empty, so Today can quick-add to
-- it on the go. It's pinned: it never finishes itself into Past lists and can't be deleted
-- (ticked items are cleared from it instead). It can be renamed.

alter table public.lists add column pinned boolean not null default false;

create unique index lists_one_pinned_per_household on public.lists (household_id) where pinned;

-- Homes that already have a shopping list keep it: the oldest open one by a shopping-ish name
-- becomes the pinned one. Everyone else gets a new, empty "Shopping".
update public.lists as list
set pinned = true, completed_at = null
from (
	select distinct on (household_id) id
	from public.lists
	where lower(trim(name)) in ('shopping', 'shopping list', 'groceries', 'grocery', 'grocery list')
	order by household_id, completed_at nulls first, created_at
) as pick
where list.id = pick.id;

insert into public.lists (household_id, name, pinned)
select home.id, 'Shopping', true
from public.households as home
where not exists (
	select 1 from public.lists where household_id = home.id and pinned
);

-- The pinned list never counts as finished.
create or replace function public.refresh_list_completion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
	target uuid := coalesce(new.list_id, old.list_id);
	total integer;
	open integer;
begin
	select count(*), count(*) filter (where not checked)
	into total, open
	from public.list_items
	where list_id = target;

	update public.lists
	set completed_at = case
		when pinned then null
		when total > 0 and open = 0 then coalesce(completed_at, now())
		else null
	end
	where id = target;

	return null;
end;
$$;

-- …and can't be deleted.
drop policy "Members can remove household lists" on public.lists;

create policy "Members can remove household lists"
	on public.lists for delete
	to authenticated
	using (public.is_household_member(household_id) and not pinned);
