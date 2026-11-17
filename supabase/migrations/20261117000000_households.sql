-- Accounts and households.
-- Profiles are created automatically for every auth user. Homes are built and joined from the app
-- through the functions in 20261117000500_accounts_and_homes.sql.

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	display_name text not null default '',
	initials text not null default '',
	accent_colour text not null default '#d6dce2',
	calendar_preferences jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.households (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	created_at timestamptz not null default now()
);

create table public.household_members (
	household_id uuid not null references public.households (id) on delete cascade,
	profile_id uuid not null references public.profiles (id) on delete cascade,
	joined_at timestamptz not null default now(),
	primary key (household_id, profile_id)
);

create index household_members_profile_id_idx on public.household_members (profile_id);

-- Membership check used by every household policy. Security definer so policies on
-- household_members can call it without recursing into themselves.
create function public.is_household_member(target_household uuid)
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
			and profile_id = (select auth.uid())
	);
$$;

-- True when the signed-in user shares a household with another profile.
create function public.shares_household_with(other_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1
		from public.household_members mine
		join public.household_members theirs on theirs.household_id = mine.household_id
		where mine.profile_id = (select auth.uid())
			and theirs.profile_id = other_profile
	);
$$;

-- A profile row for every new auth user, named from the email until it's edited.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	base_name text := split_part(new.email, '@', 1);
begin
	insert into public.profiles (id, display_name, initials)
	values (new.id, initcap(base_name), upper(left(base_name, 1)));
	return new;
end;
$$;

create trigger on_auth_user_created
	after insert on auth.users
	for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

create trigger profiles_touch_updated_at
	before update on public.profiles
	for each row execute function public.touch_updated_at();

-- Row-level security
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;

create policy "Profiles are visible to yourself and your household"
	on public.profiles for select
	to authenticated
	using (id = (select auth.uid()) or public.shares_household_with(id));

create policy "You can edit your own profile"
	on public.profiles for update
	to authenticated
	using (id = (select auth.uid()))
	with check (id = (select auth.uid()));

create policy "Members can see their household"
	on public.households for select
	to authenticated
	using (public.is_household_member(id));

create policy "Members can see who else is in their household"
	on public.household_members for select
	to authenticated
	using (public.is_household_member(household_id));

-- Households and memberships have no insert or delete policies: nobody can add themselves to a
-- home directly. create_household and join_household (a later migration) do it after checking.
