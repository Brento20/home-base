-- Household tasks and shared plans.

-- True when a profile belongs to the given household. Used to keep assignees inside the household.
create function public.is_profile_in_household(target_household uuid, target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1
		from public.household_members
		where household_id = target_household
			and profile_id = target_profile
	);
$$;

-- Tasks ----------------------------------------------------------------------------------------

create table public.tasks (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	title text not null check (char_length(title) between 1 and 160),
	notes text not null default '' check (char_length(notes) <= 2000),
	-- Null means anyone in the home can do it.
	assignee_id uuid references public.profiles (id) on delete set null,
	due_on date,
	completed_at timestamptz,
	completed_by uuid references public.profiles (id) on delete set null,
	created_by uuid references public.profiles (id) on delete set null default auth.uid(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index tasks_household_open_idx on public.tasks (household_id, completed_at, due_on);

create function public.stamp_task()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at = now();
	if new.completed_at is not null and (tg_op = 'INSERT' or old.completed_at is null) then
		new.completed_by = auth.uid();
	elsif new.completed_at is null then
		new.completed_by = null;
	end if;
	return new;
end;
$$;

create trigger tasks_stamp
	before insert or update on public.tasks
	for each row execute function public.stamp_task();

alter table public.tasks enable row level security;

create policy "Members can see household tasks"
	on public.tasks for select
	to authenticated
	using (public.is_household_member(household_id));

create policy "Members can add household tasks"
	on public.tasks for insert
	to authenticated
	with check (
		public.is_household_member(household_id)
		and (assignee_id is null or public.is_profile_in_household(household_id, assignee_id))
	);

create policy "Members can update household tasks"
	on public.tasks for update
	to authenticated
	using (public.is_household_member(household_id))
	with check (
		public.is_household_member(household_id)
		and (assignee_id is null or public.is_profile_in_household(household_id, assignee_id))
	);

create policy "Members can remove household tasks"
	on public.tasks for delete
	to authenticated
	using (public.is_household_member(household_id));

-- Plans ----------------------------------------------------------------------------------------

create table public.plans (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	title text not null check (char_length(title) between 1 and 160),
	notes text not null default '' check (char_length(notes) <= 2000),
	location text not null default '' check (char_length(location) <= 200),
	starts_at timestamptz not null,
	ends_at timestamptz check (ends_at is null or ends_at >= starts_at),
	-- All-day plans start at midnight household time; their time isn't shown.
	all_day boolean not null default false,
	-- Set for plans copied in from a calendar file, so importing the same file twice adds nothing.
	source_uid text,
	created_by uuid references public.profiles (id) on delete set null default auth.uid(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index plans_household_starts_idx on public.plans (household_id, starts_at);
create unique index plans_household_source_uid_idx on public.plans (household_id, source_uid);

create trigger plans_touch_updated_at
	before update on public.plans
	for each row execute function public.touch_updated_at();

alter table public.plans enable row level security;

create policy "Members can see household plans"
	on public.plans for select
	to authenticated
	using (public.is_household_member(household_id));

create policy "Members can add household plans"
	on public.plans for insert
	to authenticated
	with check (public.is_household_member(household_id));

create policy "Members can update household plans"
	on public.plans for update
	to authenticated
	using (public.is_household_member(household_id))
	with check (public.is_household_member(household_id));

create policy "Members can remove household plans"
	on public.plans for delete
	to authenticated
	using (public.is_household_member(household_id));
