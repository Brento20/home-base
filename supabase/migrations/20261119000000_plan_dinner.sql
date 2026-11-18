-- Plan dinner: recipes, ratings and dinner tasks.
--
-- The recipe library ships with the app (src/lib/features/recipes/library.json, ids like
-- recipe_001). Recipes a home adds itself live in public.recipes. Either kind can be rated (one
-- editable rating per person per recipe) and scheduled: scheduling makes a task that carries a
-- snapshot of the recipe at the chosen servings, so it reads the same however the recipe changes.

-- Recipes added at home ------------------------------------------------------------------------

create table public.recipes (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	title text not null check (char_length(title) between 1 and 120),
	-- Ingredient amounts are for this many servings.
	base_servings smallint not null default 2 check (base_servings between 1 and 12),
	prep_minutes smallint not null default 0 check (prep_minutes between 0 and 1440),
	cook_minutes smallint not null default 0 check (cook_minutes between 0 and 1440),
	rest_minutes smallint not null default 0 check (rest_minutes between 0 and 1440),
	cuisine text check (char_length(cuisine) <= 60),
	is_vegetarian boolean not null default false,
	is_vegan boolean not null default false,
	proteins text[] not null default '{}' check (cardinality(proteins) <= 12),
	-- [{ name, quantity, unit, prepNote }]
	ingredients jsonb not null default '[]'
		check (jsonb_typeof(ingredients) = 'array' and pg_column_size(ingredients) < 20000),
	-- ["Heat the oven…", …]
	steps jsonb not null default '[]'
		check (jsonb_typeof(steps) = 'array' and pg_column_size(steps) < 20000),
	-- Per serving, when the home gives it: { energyKj, proteinG, fatG, carbsG, sugarsG, fibreG }.
	nutrition jsonb check (nutrition is null or jsonb_typeof(nutrition) = 'object'),
	notes text not null default '' check (char_length(notes) <= 1000),
	created_by uuid references public.profiles (id) on delete set null default auth.uid(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint recipes_vegan_is_vegetarian check (not is_vegan or is_vegetarian)
);

create index recipes_household_idx on public.recipes (household_id, title);

create trigger recipes_touch_updated_at
	before update on public.recipes
	for each row execute function public.touch_updated_at();

alter table public.recipes enable row level security;

create policy "Members can see household recipes"
	on public.recipes for select
	to authenticated
	using (public.is_household_member(household_id));

create policy "Members can add household recipes"
	on public.recipes for insert
	to authenticated
	with check (public.is_household_member(household_id));

create policy "Members can edit household recipes"
	on public.recipes for update
	to authenticated
	using (public.is_household_member(household_id))
	with check (public.is_household_member(household_id));

create policy "Members can remove household recipes"
	on public.recipes for delete
	to authenticated
	using (public.is_household_member(household_id));

-- Ratings -------------------------------------------------------------------------------------

-- One rating per person per recipe, which they can change. Everyone in the home can see them all
-- (the recipe page shows each person's stars); only you can set yours.
create table public.recipe_ratings (
	household_id uuid not null references public.households (id) on delete cascade,
	recipe_id text not null check (char_length(recipe_id) between 1 and 64),
	profile_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
	stars smallint not null check (stars between 1 and 5),
	updated_at timestamptz not null default now(),
	primary key (household_id, recipe_id, profile_id)
);

create trigger recipe_ratings_touch_updated_at
	before update on public.recipe_ratings
	for each row execute function public.touch_updated_at();

alter table public.recipe_ratings enable row level security;

create policy "Members can see household ratings"
	on public.recipe_ratings for select
	to authenticated
	using (public.is_household_member(household_id));

create policy "People can rate as themselves"
	on public.recipe_ratings for insert
	to authenticated
	with check (profile_id = (select auth.uid()) and public.is_household_member(household_id));

create policy "People can change their own ratings"
	on public.recipe_ratings for update
	to authenticated
	using (profile_id = (select auth.uid()) and public.is_household_member(household_id))
	with check (profile_id = (select auth.uid()) and public.is_household_member(household_id));

create policy "People can remove their own ratings"
	on public.recipe_ratings for delete
	to authenticated
	using (profile_id = (select auth.uid()));

-- A home recipe's ratings go with it.
create function public.forget_recipe_ratings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	delete from public.recipe_ratings
	where household_id = old.household_id and recipe_id = old.id::text;
	return old;
end;
$$;

create trigger recipes_forget_ratings
	after delete on public.recipes
	for each row execute function public.forget_recipe_ratings();

-- Dinner tasks --------------------------------------------------------------------------------

-- A dinner is a task with a recipe: who's cooking is the assignee, the day is due_on. It can have
-- a time, and it keeps the recipe as scheduled (title, servings, scaled ingredients, method).
alter table public.tasks
	add column due_time time,
	add column recipe_id text check (char_length(recipe_id) <= 64),
	add column servings smallint check (servings between 1 and 12),
	add column recipe jsonb
		check (recipe is null or (jsonb_typeof(recipe) = 'object' and pg_column_size(recipe) < 30000)),
	add constraint tasks_dinner_complete check ((recipe_id is null) = (recipe is null));

create index tasks_household_recipe_idx on public.tasks (household_id, due_on)
	where recipe_id is not null;

-- Check-ins: who has answered "How was it?" (or waved it off) for which dinner, so each person
-- is asked once per dinner they cooked or ate.

create function public.can_see_task(target_task uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1
		from public.tasks task
		where task.id = target_task
			and public.is_household_member(task.household_id)
	);
$$;

create table public.dinner_checkins (
	task_id uuid not null references public.tasks (id) on delete cascade,
	profile_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
	created_at timestamptz not null default now(),
	primary key (task_id, profile_id)
);

alter table public.dinner_checkins enable row level security;

create policy "People can see their own check-ins"
	on public.dinner_checkins for select
	to authenticated
	using (profile_id = (select auth.uid()) and public.can_see_task(task_id));

create policy "People can check in as themselves"
	on public.dinner_checkins for insert
	to authenticated
	with check (profile_id = (select auth.uid()) and public.can_see_task(task_id));
