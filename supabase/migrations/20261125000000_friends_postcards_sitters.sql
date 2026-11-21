-- Friends, postcards and house-sitter links.
--
-- Friends are people, not homes: two people become friends when one opens the other's friend
-- link (a link for one person, kept as a hash like invite links). Friends see each other's name,
-- colour, photo and home's name, and nothing of each other's home. Either can remove the other,
-- and blocking someone removes the friendship and stops them adding you or sending postcards.
--
-- A postcard is a short message to a friend that lands in their home's feed. The sender's name
-- and home are copied onto it when it's sent, so the people who receive it never need to read
-- the sender's profile. Anyone in the receiving home can remove it.
--
-- A house-sitter link shows someone looking after the home a single page: a message, the notes
-- picked for them and, if asked, the chores until the link ends. No account, nothing else of the
-- home, and never money. It works until its end date or until someone in the home revokes it.
--
-- Every write goes through the functions below; the tables only let you read your own rows.

-- Friends -------------------------------------------------------------------------------------

create table public.friendships (
	profile_a uuid not null references public.profiles (id) on delete cascade,
	profile_b uuid not null references public.profiles (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (profile_a, profile_b),
	-- One row per pair, the smaller id first.
	constraint friendships_ordered check (profile_a < profile_b)
);

create index friendships_profile_b_idx on public.friendships (profile_b);

alter table public.friendships enable row level security;

create policy "You can see your own friendships"
	on public.friendships for select
	to authenticated
	using ((select auth.uid()) in (profile_a, profile_b));

create table public.friend_links (
	id uuid primary key default gen_random_uuid(),
	token_hash text not null unique,
	created_by uuid not null references public.profiles (id) on delete cascade,
	created_at timestamptz not null default now(),
	expires_at timestamptz not null,
	used_at timestamptz,
	used_by uuid references public.profiles (id) on delete set null,
	revoked_at timestamptz
);

create index friend_links_created_by_idx on public.friend_links (created_by, created_at desc);

alter table public.friend_links enable row level security;

create policy "You can see your own friend links"
	on public.friend_links for select
	to authenticated
	using (created_by = (select auth.uid()));

create table public.blocks (
	blocker uuid not null references public.profiles (id) on delete cascade,
	blocked uuid not null references public.profiles (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (blocker, blocked),
	constraint blocks_not_yourself check (blocker <> blocked)
);

create index blocks_blocked_idx on public.blocks (blocked);

alter table public.blocks enable row level security;

create policy "You can see who you've blocked"
	on public.blocks for select
	to authenticated
	using (blocker = (select auth.uid()));

-- How a person is named to friends and on postcards: their nickname, else their display name.
create function public.public_name(person uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
	select coalesce(nullif(nickname, ''), nullif(display_name, ''), 'Someone')
	from public.profiles
	where id = person;
$$;

create function public.is_friend(other_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1
		from public.friendships
		where profile_a = least((select auth.uid()), other_profile)
			and profile_b = greatest((select auth.uid()), other_profile)
	);
$$;

-- True when either person has blocked the other.
create function public.blocked_between(one uuid, two uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1
		from public.blocks
		where (blocker = one and blocked = two) or (blocker = two and blocked = one)
	);
$$;

-- Signed in with a finished profile. Friends don't need a home.
create function public.assert_has_profile()
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
	return caller;
end;
$$;

-- A new friend link: returns its token, the only time it's ever seen. Good for one person and
-- two weeks. At most ten unused links at once, so a script can't mint them by the thousand.
create function public.create_friend_link()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_has_profile();
	token text := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
begin
	if (
		select count(*)
		from public.friend_links
		where created_by = caller
			and used_at is null
			and revoked_at is null
			and expires_at > now()
	) >= 10 then
		raise exception 'You have ten friend links waiting already. Cancel one first.';
	end if;

	insert into public.friend_links (token_hash, created_by, expires_at)
	values (public.invite_token_hash(token), caller, now() + interval '14 days');
	return token;
end;
$$;

create function public.revoke_friend_link(link uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
	update public.friend_links
	set revoked_at = now()
	where id = link and created_by = (select auth.uid()) and revoked_at is null and used_at is null;
	if not found then
		raise exception 'That link is already gone.';
	end if;
end;
$$;

-- What a friend link shows before it's accepted. Anyone holding the link may see this (the token
-- is the secret): just the sender's name and colour.
create function public.preview_friend_link(token text)
returns table (
	name text,
	initials text,
	colour text,
	usable boolean,
	is_you boolean,
	already_friends boolean
)
language sql
stable
security definer
set search_path = ''
as $$
	select
		public.public_name(l.created_by),
		p.initials,
		p.accent_colour,
		l.revoked_at is null and l.used_at is null and l.expires_at > now(),
		l.created_by = (select auth.uid()),
		public.is_friend(l.created_by)
	from public.friend_links l
	join public.profiles p on p.id = l.created_by
	where l.token_hash = public.invite_token_hash(token);
$$;

-- Makes the caller and the link's sender friends. Returns the sender's id.
create function public.accept_friend_link(token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_has_profile();
	link public.friend_links;
begin
	select * into link
	from public.friend_links
	where token_hash = public.invite_token_hash(token)
	for update;

	if link.id is null or link.revoked_at is not null or link.expires_at <= now() then
		raise exception 'This friend link has expired. Ask for a new one.';
	end if;
	if link.created_by = caller then
		raise exception 'That’s your own link. Send it to a friend instead.';
	end if;
	if public.is_friend(link.created_by) then
		return link.created_by;
	end if;
	if link.used_at is not null then
		raise exception 'This friend link has been used. Ask for a new one.';
	end if;
	if public.blocked_between(caller, link.created_by) then
		raise exception 'This friend link doesn’t work any more.';
	end if;

	insert into public.friendships (profile_a, profile_b)
	values (least(caller, link.created_by), greatest(caller, link.created_by))
	on conflict do nothing;

	update public.friend_links set used_at = now(), used_by = caller where id = link.id;
	return link.created_by;
end;
$$;

create function public.remove_friend(other_profile uuid)
returns void
language sql
security definer
set search_path = ''
as $$
	delete from public.friendships
	where profile_a = least((select auth.uid()), other_profile)
		and profile_b = greatest((select auth.uid()), other_profile);
$$;

-- Ends the friendship, takes their postcards off your home's feed, and stops new ones.
create function public.block_person(other_profile uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_has_profile();
begin
	if other_profile = caller then
		raise exception 'You can’t block yourself.';
	end if;
	if not exists (select 1 from public.profiles where id = other_profile) then
		raise exception 'That person isn’t here any more.';
	end if;

	insert into public.blocks (blocker, blocked) values (caller, other_profile)
	on conflict do nothing;

	perform public.remove_friend(other_profile);

	delete from public.postcards
	where from_profile = other_profile
		and to_household in (select household_id from public.household_members where profile_id = caller);
end;
$$;

create function public.unblock_person(other_profile uuid)
returns void
language sql
security definer
set search_path = ''
as $$
	delete from public.blocks where blocker = (select auth.uid()) and blocked = other_profile;
$$;

-- Your friends, as friends see each other: name, colour, whether there's a photo, their home's
-- name and since when. Nothing else of their profile or their home.
create function public.my_friends()
returns table (
	id uuid,
	name text,
	initials text,
	colour text,
	avatar_path text,
	home_name text,
	friends_since timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
	select
		p.id,
		public.public_name(p.id),
		p.initials,
		p.accent_colour,
		p.avatar_path,
		h.name,
		f.created_at
	from public.friendships f
	join public.profiles p
		on p.id = case when f.profile_a = (select auth.uid()) then f.profile_b else f.profile_a end
	left join public.household_members m on m.profile_id = p.id
	left join public.households h on h.id = m.household_id
	where (select auth.uid()) in (f.profile_a, f.profile_b)
	order by lower(public.public_name(p.id));
$$;

-- People you've blocked, by name, so you can unblock them.
create function public.my_blocks()
returns table (id uuid, name text, blocked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
	select b.blocked, public.public_name(b.blocked), b.created_at
	from public.blocks b
	where b.blocker = (select auth.uid())
	order by b.created_at desc;
$$;

-- Friends' photos -----------------------------------------------------------------------------

create or replace function public.can_see_avatar(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select split_part(object_name, '/', 1) = (select auth.uid())::text
		or exists (
			select 1
			from public.profiles p
			where p.id::text = split_part(object_name, '/', 1)
				and (public.shares_household_with(p.id) or public.is_friend(p.id))
		);
$$;

-- The photo's path for someone you may see: yourself, your home, your friends. The avatar route
-- reads it through this, because friends can't read each other's profile rows.
create function public.visible_avatar_path(person uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
	select avatar_path
	from public.profiles
	where id = person
		and (
			id = (select auth.uid())
			or public.shares_household_with(id)
			or public.is_friend(id)
		);
$$;

-- Postcards -----------------------------------------------------------------------------------

create table public.postcards (
	id uuid primary key default gen_random_uuid(),
	to_household uuid not null references public.households (id) on delete cascade,
	from_profile uuid references public.profiles (id) on delete set null,
	-- Copied when it's sent, so the home that receives it never reads the sender's profile.
	from_name text not null check (char_length(from_name) <= 60),
	from_initials text not null default '' check (char_length(from_initials) <= 4),
	from_colour text not null default '#d6dce2' check (char_length(from_colour) <= 9),
	from_home text not null default '' check (char_length(from_home) <= 30),
	body text not null check (char_length(body) between 1 and 500),
	created_at timestamptz not null default now()
);

create index postcards_to_household_created_idx on public.postcards (to_household, created_at desc);
create index postcards_from_profile_created_idx on public.postcards (from_profile, created_at desc);

alter table public.postcards enable row level security;

create policy "Homes see postcards sent to them, senders see their own"
	on public.postcards for select
	to authenticated
	using (public.is_household_member(to_household) or from_profile = (select auth.uid()));

create policy "Homes and senders can remove postcards"
	on public.postcards for delete
	to authenticated
	using (public.is_household_member(to_household) or from_profile = (select auth.uid()));

-- Sends a postcard to a friend's home. Twenty a day at most.
create function public.send_postcard(friend uuid, message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_has_profile();
	clean text := btrim(message);
	their_home uuid;
	my_home uuid;
	me public.profiles;
	sent uuid;
begin
	if char_length(clean) not between 1 and 500 then
		raise exception 'Write a postcard between 1 and 500 characters.';
	end if;
	if not public.is_friend(friend) or public.blocked_between(caller, friend) then
		raise exception 'You can only send postcards to friends.';
	end if;

	select household_id into their_home from public.household_members where profile_id = friend;
	if their_home is null then
		raise exception 'They’re not in a home yet, so there’s no feed to send it to.';
	end if;
	select household_id into my_home from public.household_members where profile_id = caller;
	if my_home = their_home then
		raise exception 'You share a home. Post it on your feed instead.';
	end if;

	if (
		select count(*) from public.postcards
		where from_profile = caller and created_at > now() - interval '1 day'
	) >= 20 then
		raise exception 'That’s twenty postcards today. Send more tomorrow.';
	end if;

	select * into me from public.profiles where id = caller;
	insert into public.postcards (
		to_household, from_profile, from_name, from_initials, from_colour, from_home, body
	)
	values (
		their_home,
		caller,
		left(public.public_name(caller), 60),
		left(me.initials, 4),
		me.accent_colour,
		coalesce(left((select name from public.households where id = my_home), 30), ''),
		clean
	)
	returning id into sent;
	return sent;
end;
$$;

-- House-sitter links --------------------------------------------------------------------------

create table public.sitter_links (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	token_hash text not null unique,
	created_by uuid references public.profiles (id) on delete set null,
	-- Who it's for, so the home can tell its links apart ("Sam, house-sitting").
	label text not null default '' check (char_length(label) <= 40),
	message text not null default '' check (char_length(message) <= 1000),
	note_ids uuid[] not null default '{}' check (cardinality(note_ids) <= 30),
	show_chores boolean not null default false,
	created_at timestamptz not null default now(),
	expires_at timestamptz not null,
	revoked_at timestamptz
);

create index sitter_links_household_idx on public.sitter_links (household_id, created_at desc);

alter table public.sitter_links enable row level security;

create policy "Members can see their home's sitter links"
	on public.sitter_links for select
	to authenticated
	using (public.is_household_member(household_id));

-- A new sitter link for the caller's home: returns its token, the only time it's ever seen.
-- Only notes that belong to the home are kept. Lasts until the end of `last_day` (1 to 60 days
-- away) in the home's time zone.
create function public.create_sitter_link(
	who text,
	note text,
	notes uuid[],
	chores boolean,
	last_day date
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := (select auth.uid());
	home public.households;
	today date;
	token text := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
begin
	select h.* into home
	from public.households h
	join public.household_members m on m.household_id = h.id
	where m.profile_id = caller;
	if home.id is null then
		raise exception 'You’re not in a home.';
	end if;

	today := (now() at time zone coalesce(home.time_zone, 'Australia/Sydney'))::date;
	if last_day is null or last_day < today or last_day > today + 60 then
		raise exception 'Pick an end date between today and 60 days away.';
	end if;
	if char_length(btrim(coalesce(who, ''))) > 40 or char_length(coalesce(note, '')) > 1000 then
		raise exception 'Keep the name under 40 characters and the message under 1000.';
	end if;
	if (
		select count(*) from public.sitter_links
		where household_id = home.id and revoked_at is null and expires_at > now()
	) >= 10 then
		raise exception 'Your home has ten sitter links on the go. Stop one first.';
	end if;

	insert into public.sitter_links (
		household_id, token_hash, created_by, label, message, note_ids, show_chores, expires_at
	)
	values (
		home.id,
		public.invite_token_hash(token),
		caller,
		btrim(coalesce(who, '')),
		btrim(coalesce(note, '')),
		coalesce(
			(
				select array_agg(n.id order by n.title)
				from public.home_notes n
				where n.household_id = home.id and n.id = any (coalesce(notes, '{}'))
			),
			'{}'
		),
		coalesce(chores, false),
		((last_day + 1)::timestamp at time zone coalesce(home.time_zone, 'Australia/Sydney'))
	);
	return token;
end;
$$;

create function public.revoke_sitter_link(link uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
	update public.sitter_links
	set revoked_at = now()
	where id = link and revoked_at is null and public.is_household_member(household_id);
	if not found then
		raise exception 'That link is already stopped.';
	end if;
end;
$$;

-- What a sitter link shows, or null once it's ended or been stopped. Open to anyone holding the
-- link (the token is the secret). Secret notes come back sealed if they were; the app opens them
-- with its own key, never the database. Money, points, lists, plans and the feed are never in it.
create function public.sitter_view(token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
	select jsonb_build_object(
		'household_id', l.household_id,
		'home_name', h.name,
		'label', l.label,
		'message', l.message,
		'expires_at', l.expires_at,
		'shared_by', public.public_name(l.created_by),
		'notes', coalesce(
			(
				select jsonb_agg(
					jsonb_build_object('id', n.id, 'title', n.title, 'body', n.body, 'is_secret', n.is_secret)
					order by n.title
				)
				from public.home_notes n
				where n.household_id = l.household_id and n.id = any (l.note_ids)
			),
			'[]'::jsonb
		),
		'chores', case when l.show_chores then coalesce(
			(
				select jsonb_agg(
					jsonb_build_object(
						'title', t.title,
						'due_on', t.due_on,
						'repeat', t.repeat,
						'who', case when t.assignee_id is null then null else public.public_name(t.assignee_id) end
					)
					order by t.due_on, t.title
				)
				from public.tasks t
				where t.household_id = l.household_id
					and t.completed_at is null
					and t.recipe_id is null
					and t.due_on is not null
					and t.due_on <= (l.expires_at at time zone coalesce(h.time_zone, 'Australia/Sydney'))::date
			),
			'[]'::jsonb
		) else '[]'::jsonb end
	)
	from public.sitter_links l
	join public.households h on h.id = l.household_id
	where l.token_hash = public.invite_token_hash(token)
		and l.revoked_at is null
		and l.expires_at > now();
$$;

-- Who may call what ---------------------------------------------------------------------------

revoke execute on function
	public.public_name(uuid),
	public.is_friend(uuid),
	public.blocked_between(uuid, uuid),
	public.assert_has_profile(),
	public.create_friend_link(),
	public.revoke_friend_link(uuid),
	public.preview_friend_link(text),
	public.accept_friend_link(text),
	public.remove_friend(uuid),
	public.block_person(uuid),
	public.unblock_person(uuid),
	public.my_friends(),
	public.my_blocks(),
	public.visible_avatar_path(uuid),
	public.send_postcard(uuid, text),
	public.create_sitter_link(text, text, uuid[], boolean, date),
	public.revoke_sitter_link(uuid),
	public.sitter_view(text)
from public, anon;

grant execute on function
	public.is_friend(uuid),
	public.create_friend_link(),
	public.revoke_friend_link(uuid),
	public.preview_friend_link(text),
	public.accept_friend_link(text),
	public.remove_friend(uuid),
	public.block_person(uuid),
	public.unblock_person(uuid),
	public.my_friends(),
	public.my_blocks(),
	public.visible_avatar_path(uuid),
	public.send_postcard(uuid, text),
	public.create_sitter_link(text, text, uuid[], boolean, date),
	public.revoke_sitter_link(uuid)
to authenticated;

-- Signed-out people open friend and sitter links too.
grant execute on function
	public.preview_friend_link(text),
	public.sitter_view(text)
to anon, authenticated;
