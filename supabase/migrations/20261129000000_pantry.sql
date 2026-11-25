-- The pantry: things a home always has, so shopping for the week's dinners starts with them
-- unticked (salt, olive oil, the rice that's always in the cupboard). Remembered when you
-- untick something and say so, forgotten when you tick it back. One row per thing, by the same
-- key the app merges ingredients by ("brown onion"); members of the home can see and change it.

create table public.pantry_staples (
	household_id uuid not null references public.households (id) on delete cascade,
	key text not null check (char_length(key) between 1 and 80),
	created_at timestamptz not null default now(),
	primary key (household_id, key)
);

alter table public.pantry_staples enable row level security;

create policy "Members can see their pantry"
	on public.pantry_staples for select
	to authenticated
	using (public.is_household_member(household_id));

create policy "Members can add to their pantry"
	on public.pantry_staples for insert
	to authenticated
	with check (public.is_household_member(household_id));

create policy "Members can take things out of their pantry"
	on public.pantry_staples for delete
	to authenticated
	using (public.is_household_member(household_id));
