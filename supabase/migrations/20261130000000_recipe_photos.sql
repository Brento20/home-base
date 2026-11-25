-- A photo for any recipe a home cooks: its own recipes and the library's, which ship with the app
-- (ids like recipe_012), so the photo is kept beside the recipe rather than on it. One per
-- recipe per home. Files live in the private recipe-photos bucket as <household id>/<file>, so
-- the first folder names the home; anyone in the home can see, add, change or remove them.

create table public.recipe_photos (
	household_id uuid not null references public.households (id) on delete cascade,
	recipe_id text not null check (
		recipe_id ~ '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|recipe_[0-9]{3})$'
	),
	photo_path text not null check (
		photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
		and split_part(photo_path, '/', 1) = household_id::text
	),
	added_by uuid references public.profiles (id) on delete set null default auth.uid(),
	added_at timestamptz not null default now(),
	primary key (household_id, recipe_id)
);

alter table public.recipe_photos enable row level security;

create policy "Members can see their recipe photos"
	on public.recipe_photos for select
	to authenticated
	using (public.is_household_member(household_id));

create policy "Members can add recipe photos"
	on public.recipe_photos for insert
	to authenticated
	with check (public.is_household_member(household_id));

create policy "Members can change recipe photos"
	on public.recipe_photos for update
	to authenticated
	using (public.is_household_member(household_id))
	with check (public.is_household_member(household_id));

create policy "Members can remove recipe photos"
	on public.recipe_photos for delete
	to authenticated
	using (public.is_household_member(household_id));

-- A home's own recipe going takes its photo's row with it (the app removes the file first).
create function public.forget_recipe_photo()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
	delete from public.recipe_photos
	where household_id = old.household_id and recipe_id = old.id::text;
	return old;
end;
$$;

create trigger recipes_forget_photo
	after delete on public.recipes
	for each row execute function public.forget_recipe_photo();

-- The files ---------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- True when the file's folder is a home the caller is in.
create function public.can_use_recipe_photo(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
	folder text := split_part(object_name, '/', 1);
begin
	if folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
		return false;
	end if;
	return public.is_household_member(folder::uuid);
end;
$$;

revoke execute on function public.can_use_recipe_photo(text) from public, anon;
grant execute on function public.can_use_recipe_photo(text) to authenticated;

create policy "Members can see their home's recipe photos"
	on storage.objects for select
	to authenticated
	using (bucket_id = 'recipe-photos' and public.can_use_recipe_photo(name));

create policy "Members can add recipe photos to their home"
	on storage.objects for insert
	to authenticated
	with check (bucket_id = 'recipe-photos' and public.can_use_recipe_photo(name));

create policy "Members can remove their home's recipe photos"
	on storage.objects for delete
	to authenticated
	using (bucket_id = 'recipe-photos' and public.can_use_recipe_photo(name));
