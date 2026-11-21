-- Invite links replace home passwords. An owner makes a link for one person (or a few); it
-- expires after a week by default and can be revoked. Only a hash of each link's token is kept,
-- so the table can't be used to join even by someone who reads it. Password joining goes:
-- join_household, the password functions and household_secrets are dropped, and building a home
-- no longer asks for one. Names were unique across every home only so people could join by
-- name; now any number of homes can be called "Home", and no one learns which names exist.

create table public.household_invites (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	token_hash text not null unique,
	created_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	expires_at timestamptz not null,
	max_uses integer not null default 1 check (max_uses between 1 and 20),
	uses integer not null default 0 check (uses >= 0),
	revoked_at timestamptz
);

create index household_invites_household_idx on public.household_invites (household_id, created_at desc);

-- Owners can see their home's links (to list and revoke them); everything else goes through the
-- functions below.
alter table public.household_invites enable row level security;

create policy "Owners can see their home's invites"
	on public.household_invites for select
	to authenticated
	using (public.is_household_owner(household_id));

create function public.invite_token_hash(token text)
returns text
language sql
immutable
set search_path = ''
as $$
	select encode(extensions.digest(token, 'sha256'), 'hex');
$$;

-- A new link: returns its token, the only time it's ever seen. URL-safe, 192 random bits.
create function public.create_household_invite(
	target_household uuid,
	valid_days integer default 7,
	use_limit integer default 1
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
	token text := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
begin
	if not public.is_household_owner(target_household) then
		raise exception 'Only the home’s owner can invite people.';
	end if;
	if valid_days not between 1 and 30 then
		raise exception 'An invite lasts between 1 and 30 days.';
	end if;
	if use_limit not between 1 and 20 then
		raise exception 'An invite works for 1 to 20 people.';
	end if;

	insert into public.household_invites (household_id, token_hash, created_by, expires_at, max_uses)
	values (
		target_household,
		public.invite_token_hash(token),
		(select auth.uid()),
		now() + make_interval(days => valid_days),
		use_limit
	);
	return token;
end;
$$;

create function public.revoke_household_invite(invite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
	update public.household_invites
	set revoked_at = now()
	where id = invite
		and revoked_at is null
		and public.is_household_owner(household_id);
	if not found then
		raise exception 'That invite is already gone.';
	end if;
end;
$$;

-- What an invite link shows before it's accepted: the home's name and who sent it, and whether
-- it still works. Anyone holding the link may see this (the token is the secret).
create function public.preview_household_invite(token text)
returns table (home_name text, invited_by text, usable boolean)
language sql
stable
security definer
set search_path = ''
as $$
	select
		h.name,
		coalesce(nullif(p.nickname, ''), p.display_name),
		i.revoked_at is null and i.expires_at > now() and i.uses < i.max_uses
	from public.household_invites i
	join public.households h on h.id = i.household_id
	left join public.profiles p on p.id = i.created_by
	where i.token_hash = public.invite_token_hash(token);
$$;

-- Joins the caller to the invite's home. Locks the invite row, so two people can't both use the
-- last place on a one-person link.
create function public.accept_household_invite(token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_ready_for_home();
	found_invite public.household_invites;
begin
	select * into found_invite
	from public.household_invites
	where token_hash = public.invite_token_hash(token)
	for update;

	if found_invite.id is null
		or found_invite.revoked_at is not null
		or found_invite.expires_at <= now()
		or found_invite.uses >= found_invite.max_uses then
		raise exception 'This invite has expired or been used. Ask for a new one.';
	end if;

	insert into public.household_members (household_id, profile_id, role)
	values (found_invite.household_id, caller, 'member');

	update public.household_invites set uses = uses + 1 where id = found_invite.id;

	update public.profiles
	set accent_colour = public.pick_accent_colour(found_invite.household_id)
	where id = caller;

	return found_invite.household_id;
end;
$$;

-- Building a home: a name, no password.
create function public.create_household(home_name text)
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

	insert into public.households (name, created_by) values (clean_name, caller)
	returning id into home;

	insert into public.household_members (household_id, profile_id, role)
	values (home, caller, 'owner');

	update public.profiles set accent_colour = public.pick_accent_colour(home) where id = caller;

	return home;
end;
$$;

revoke execute on function
	public.create_household_invite(uuid, integer, integer),
	public.revoke_household_invite(uuid),
	public.preview_household_invite(text),
	public.accept_household_invite(text),
	public.create_household(text)
from public, anon;

grant execute on function
	public.create_household_invite(uuid, integer, integer),
	public.revoke_household_invite(uuid),
	public.accept_household_invite(text),
	public.create_household(text)
to authenticated;

-- Signed-out people open invite links too, so the preview is open to them.
grant execute on function public.preview_household_invite(text) to anon, authenticated;

-- Password joining is gone.
drop function public.join_household(text, text);
drop function public.set_household_password(uuid, text);
drop function public.household_has_password(uuid);
drop function public.create_household(text, text);
drop table public.household_secrets;
drop table public.join_attempts;
drop index public.households_name_unique;
