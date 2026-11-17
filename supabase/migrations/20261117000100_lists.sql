-- Shared lists, starting with groceries.

create table public.lists (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	kind text not null default 'grocery' check (kind in ('grocery', 'checklist')),
	name text not null,
	created_at timestamptz not null default now()
);

create index lists_household_id_idx on public.lists (household_id);

create table public.list_items (
	id uuid primary key default gen_random_uuid(),
	list_id uuid not null references public.lists (id) on delete cascade,
	name text not null check (char_length(name) between 1 and 120),
	checked boolean not null default false,
	checked_at timestamptz,
	checked_by uuid references public.profiles (id) on delete set null,
	created_by uuid references public.profiles (id) on delete set null default auth.uid(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index list_items_list_id_idx on public.list_items (list_id, checked, created_at desc);

-- Record who checked an item and when, so later screens can show it without extra work.
create function public.stamp_list_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at = now();
	if new.checked and (tg_op = 'INSERT' or not old.checked) then
		new.checked_at = now();
		new.checked_by = auth.uid();
	elsif not new.checked then
		new.checked_at = null;
		new.checked_by = null;
	end if;
	return new;
end;
$$;

create trigger list_items_stamp
	before insert or update on public.list_items
	for each row execute function public.stamp_list_item();

create function public.can_use_list(target_list uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1
		from public.lists
		where id = target_list
			and public.is_household_member(household_id)
	);
$$;

alter table public.lists enable row level security;
alter table public.list_items enable row level security;

create policy "Members can see household lists"
	on public.lists for select
	to authenticated
	using (public.is_household_member(household_id));

create policy "Members can create household lists"
	on public.lists for insert
	to authenticated
	with check (public.is_household_member(household_id));

create policy "Members can rename household lists"
	on public.lists for update
	to authenticated
	using (public.is_household_member(household_id))
	with check (public.is_household_member(household_id));

create policy "Members can see list items"
	on public.list_items for select
	to authenticated
	using (public.can_use_list(list_id));

create policy "Members can add list items"
	on public.list_items for insert
	to authenticated
	with check (public.can_use_list(list_id));

create policy "Members can update list items"
	on public.list_items for update
	to authenticated
	using (public.can_use_list(list_id))
	with check (public.can_use_list(list_id));

create policy "Members can remove list items"
	on public.list_items for delete
	to authenticated
	using (public.can_use_list(list_id));
