-- Sign-up, profiles and homes anyone can build or join.
--
-- A new person signs up, fills in their profile (onboarded_at is set when they do), then either
-- builds a home, becoming its owner, or joins one with its name and password. Home passwords are
-- hashed into household_secrets, a table no app query can read; only the functions below use it.
-- Notes give each home a place for the wifi password, bin nights and the like.

-- Profiles ------------------------------------------------------------------------------------

alter table public.profiles
	add column first_name text not null default '' check (char_length(first_name) <= 40),
	add column last_name text not null default '' check (char_length(last_name) <= 40),
	add column nickname text not null default '' check (char_length(nickname) <= 24),
	add column pronouns text not null default '' check (char_length(pronouns) <= 24),
	add column date_of_birth date check (date_of_birth >= '1900-01-01'),
	add column avatar_path text check (char_length(avatar_path) <= 200),
	add column onboarded_at timestamptz;

-- People already in a home skip onboarding; they can fill in the new fields from Home.
update public.profiles p
set onboarded_at = now(), nickname = left(p.display_name, 24), first_name = left(p.display_name, 40)
where exists (select 1 from public.household_members m where m.profile_id = p.id);

-- Homes ---------------------------------------------------------------------------------------

alter table public.households
	add constraint households_name_length check (char_length(name) between 3 and 30),
	add column created_by uuid references public.profiles (id) on delete set null;

create unique index households_name_unique on public.households (lower(name));

alter table public.household_members
	add column role text not null default 'member' check (role in ('owner', 'member'));

-- Everyone already in a home looks after it.
update public.household_members set role = 'owner';

create table public.household_secrets (
	household_id uuid primary key references public.households (id) on delete cascade,
	password_hash text not null,
	updated_at timestamptz not null default now()
);

create table public.join_attempts (
	id bigint generated always as identity primary key,
	profile_id uuid not null references public.profiles (id) on delete cascade,
	attempted_at timestamptz not null default now()
);

create index join_attempts_recent_idx on public.join_attempts (profile_id, attempted_at desc);

-- Row-level security on, and no policies: nothing in the app can read or write these directly.
alter table public.household_secrets enable row level security;
alter table public.join_attempts enable row level security;

create function public.is_household_owner(target_household uuid)
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
			and role = 'owner'
	);
$$;

create policy "Owners can rename their household"
	on public.households for update
	to authenticated
	using (public.is_household_owner(id))
	with check (public.is_household_owner(id));

-- Gives the caller the first colour nobody else in the home is using.
create function public.pick_accent_colour(target_household uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
	select coalesce(
		(
			select colour
			from unnest(array['#e58440', '#d6dce2', '#8fb7a5', '#c79ad6', '#e0c36a', '#7fa7d9'])
				with ordinality as palette (colour, position)
			where colour not in (
				select p.accent_colour
				from public.household_members m
				join public.profiles p on p.id = m.profile_id
				where m.household_id = target_household
					and m.profile_id <> (select auth.uid())
			)
			order by position
			limit 1
		),
		'#d6dce2'
	);
$$;

-- Checks shared by building and joining: signed in, profile done, not already in a home.
create function public.assert_ready_for_home()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
	caller uuid := (select auth.uid());
begin
	if caller is null then
		raise exception 'Sign in first.';
	end if;
	if not exists (select 1 from public.profiles where id = caller and onboarded_at is not null) then
		raise exception 'Finish your profile first.';
	end if;
	if exists (select 1 from public.household_members where profile_id = caller) then
		raise exception 'You’re already part of a home.';
	end if;
	return caller;
end;
$$;

create function public.create_household(home_name text, home_password text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_ready_for_home();
	clean_name text := btrim(home_name);
	home uuid;
begin
	if char_length(clean_name) not between 3 and 30 then
		raise exception 'Give your home a name between 3 and 30 characters.';
	end if;
	if char_length(home_password) < 8 then
		raise exception 'Use at least 8 characters for the home password.';
	end if;

	begin
		insert into public.households (name, created_by) values (clean_name, caller)
		returning id into home;
	exception when unique_violation then
		raise exception 'That name is taken. Try another.';
	end;

	insert into public.household_secrets (household_id, password_hash)
	values (home, extensions.crypt(home_password, extensions.gen_salt('bf')));

	insert into public.household_members (household_id, profile_id, role)
	values (home, caller, 'owner');

	update public.profiles set accent_colour = public.pick_accent_colour(home) where id = caller;

	return home;
end;
$$;

-- Returns the home's id, or null when the name and password don't match. A mismatch returns
-- rather than raising, because raising would roll back the attempt it just recorded. The app shows
-- one message for every mismatch, so the form can't be used to find out which homes exist.
create function public.join_household(home_name text, home_password text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_ready_for_home();
	home uuid;
begin
	if (
		select count(*)
		from public.join_attempts
		where profile_id = caller and attempted_at > now() - interval '15 minutes'
	) >= 5 then
		raise exception 'Too many tries. Wait 15 minutes and try again.';
	end if;

	-- Counted before the check, so a quick script can't race past the limit.
	insert into public.join_attempts (profile_id) values (caller);

	select h.id into home
	from public.households h
	join public.household_secrets s on s.household_id = h.id
	where lower(h.name) = lower(btrim(home_name))
		and s.password_hash = extensions.crypt(home_password, s.password_hash);

	if home is null then
		return null;
	end if;

	insert into public.household_members (household_id, profile_id, role)
	values (home, caller, 'member');

	update public.profiles set accent_colour = public.pick_accent_colour(home) where id = caller;

	delete from public.join_attempts where profile_id = caller;

	return home;
end;
$$;

create function public.set_household_password(target_household uuid, new_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
	if not public.is_household_owner(target_household) then
		raise exception 'Only the home’s owner can change its password.';
	end if;
	if char_length(new_password) < 8 then
		raise exception 'Use at least 8 characters for the home password.';
	end if;

	insert into public.household_secrets (household_id, password_hash)
	values (target_household, extensions.crypt(new_password, extensions.gen_salt('bf')))
	on conflict (household_id) do update
		set password_hash = excluded.password_hash, updated_at = now();
end;
$$;

-- Whether people can join yet, without exposing anything about the hash.
create function public.household_has_password(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select public.is_household_member(target_household)
		and exists (select 1 from public.household_secrets where household_id = target_household);
$$;

revoke execute on function
	public.create_household(text, text),
	public.join_household(text, text),
	public.set_household_password(uuid, text),
	public.household_has_password(uuid),
	public.assert_ready_for_home(),
	public.pick_accent_colour(uuid)
from public, anon;

grant execute on function
	public.create_household(text, text),
	public.join_household(text, text),
	public.set_household_password(uuid, text),
	public.household_has_password(uuid)
to authenticated;

-- Notes ---------------------------------------------------------------------------------------

create table public.home_notes (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	title text not null check (char_length(title) between 1 and 60),
	body text not null default '' check (char_length(body) <= 2000),
	is_secret boolean not null default false,
	created_by uuid default auth.uid() references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index home_notes_household_id_idx on public.home_notes (household_id);

create trigger home_notes_touch_updated_at
	before update on public.home_notes
	for each row execute function public.touch_updated_at();

alter table public.home_notes enable row level security;

create policy "Members can read their home's notes"
	on public.home_notes for select
	to authenticated
	using (public.is_household_member(household_id));

create policy "Members can add notes"
	on public.home_notes for insert
	to authenticated
	with check (public.is_household_member(household_id));

create policy "Members can edit notes"
	on public.home_notes for update
	to authenticated
	using (public.is_household_member(household_id))
	with check (public.is_household_member(household_id));

create policy "Members can delete notes"
	on public.home_notes for delete
	to authenticated
	using (public.is_household_member(household_id));

-- Profile photos ------------------------------------------------------------------------------
-- Private bucket. Each file lives under its owner's user id: <user id>/avatar-<time>.jpg.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- True when the photo's folder is the caller or someone in their home.
create function public.can_see_avatar(object_name text)
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
			and theirs.profile_id::text = split_part(object_name, '/', 1)
	) or split_part(object_name, '/', 1) = (select auth.uid())::text;
$$;

create policy "People can see photos of their home"
	on storage.objects for select
	to authenticated
	using (bucket_id = 'avatars' and public.can_see_avatar(name));

create policy "People upload their own photo"
	on storage.objects for insert
	to authenticated
	with check (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy "People replace their own photo"
	on storage.objects for update
	to authenticated
	using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text)
	with check (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy "People remove their own photo"
	on storage.objects for delete
	to authenticated
	using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);
