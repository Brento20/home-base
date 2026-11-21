-- Talking on postcards, and a line about yourself.
--
-- A postcard can now be reacted to and replied to, by everyone in the home it was sent to and by
-- the person who sent it, and by no one else. The sender and the receiving home can't read each
-- other's profiles, so each reaction and reply keeps the name (and initials and colour) of whoever
-- gave it, filled in by the database from their own profile, never taken from the app.
--
-- Postcards also remember which friend they were addressed to, so a friend's page can show every
-- postcard between the two of you. And profiles get a short bio that friends can see.

-- A line about yourself ----------------------------------------------------------------------

alter table public.profiles
	add column bio text not null default '' check (char_length(bio) <= 140);

-- Who a postcard was for ----------------------------------------------------------------------

alter table public.postcards
	add column to_profile uuid references public.profiles (id) on delete set null;

create index postcards_to_profile_idx on public.postcards (to_profile, created_at desc);

-- True for the home a postcard went to and the person who sent it.
create function public.can_see_postcard(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1
		from public.postcards p
		where p.id = target
			and (public.is_household_member(p.to_household) or p.from_profile = (select auth.uid()))
	);
$$;

-- Reactions -----------------------------------------------------------------------------------

create table public.postcard_reactions (
	postcard_id uuid not null references public.postcards (id) on delete cascade,
	profile_id uuid not null references public.profiles (id) on delete cascade,
	reaction text not null check (reaction in ('heart', 'thumbs_up', 'laugh', 'thanks')),
	-- Filled in by stamp_postcard_reaction.
	name text not null default '' check (char_length(name) <= 60),
	created_at timestamptz not null default now(),
	primary key (postcard_id, profile_id)
);

alter table public.postcard_reactions enable row level security;

create policy "The postcard's home and sender see its reactions"
	on public.postcard_reactions for select
	to authenticated
	using (public.can_see_postcard(postcard_id));

create policy "People react as themselves"
	on public.postcard_reactions for insert
	to authenticated
	with check (profile_id = (select auth.uid()) and public.can_see_postcard(postcard_id));

create policy "People change their own reaction"
	on public.postcard_reactions for update
	to authenticated
	using (profile_id = (select auth.uid()))
	with check (profile_id = (select auth.uid()) and public.can_see_postcard(postcard_id));

create policy "People take back their own reaction"
	on public.postcard_reactions for delete
	to authenticated
	using (profile_id = (select auth.uid()));

create function public.stamp_postcard_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	new.name := left(public.public_name(new.profile_id), 60);
	return new;
end;
$$;

create trigger postcard_reactions_stamp
	before insert or update on public.postcard_reactions
	for each row execute function public.stamp_postcard_reaction();

-- Replies -------------------------------------------------------------------------------------

create table public.postcard_replies (
	id uuid primary key default gen_random_uuid(),
	postcard_id uuid not null references public.postcards (id) on delete cascade,
	author_id uuid references public.profiles (id) on delete set null default auth.uid(),
	-- Filled in by stamp_postcard_reply.
	author_name text not null default '' check (char_length(author_name) <= 60),
	author_initials text not null default '' check (char_length(author_initials) <= 4),
	author_colour text not null default '#d6dce2' check (char_length(author_colour) <= 9),
	body text not null check (char_length(body) between 1 and 1000),
	created_at timestamptz not null default now()
);

create index postcard_replies_postcard_idx on public.postcard_replies (postcard_id, created_at);

alter table public.postcard_replies enable row level security;

create policy "The postcard's home and sender see its replies"
	on public.postcard_replies for select
	to authenticated
	using (public.can_see_postcard(postcard_id));

create policy "People reply as themselves"
	on public.postcard_replies for insert
	to authenticated
	with check (author_id = (select auth.uid()) and public.can_see_postcard(postcard_id));

create policy "People remove their own replies"
	on public.postcard_replies for delete
	to authenticated
	using (author_id = (select auth.uid()));

create function public.stamp_postcard_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	author public.profiles;
begin
	select * into author from public.profiles where id = new.author_id;
	new.author_name := left(public.public_name(new.author_id), 60);
	new.author_initials := left(coalesce(author.initials, ''), 4);
	new.author_colour := coalesce(author.accent_colour, '#d6dce2');
	return new;
end;
$$;

create trigger postcard_replies_stamp
	before insert on public.postcard_replies
	for each row execute function public.stamp_postcard_reply();

-- send_postcard remembers who it was for --------------------------------------------------------

create or replace function public.send_postcard(friend uuid, message text, photo text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_has_profile();
	clean text := btrim(coalesce(message, ''));
	their_home uuid;
	my_home uuid;
	me public.profiles;
	sent uuid;
begin
	if char_length(clean) > 500 then
		raise exception 'Keep a postcard under 500 characters.';
	end if;
	if photo is not null and (
		split_part(photo, '/', 1) <> caller::text
		or photo !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
		or not exists (
			select 1 from storage.objects where bucket_id = 'postcard-photos' and name = photo
		)
	) then
		raise exception 'That photo didn’t upload. Try again.';
	end if;
	if clean = '' and photo is null then
		raise exception 'Write something or add a photo.';
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
		to_household,
		to_profile,
		from_profile,
		from_name,
		from_initials,
		from_colour,
		from_home,
		body,
		photo_path
	)
	values (
		their_home,
		friend,
		caller,
		left(public.public_name(caller), 60),
		left(me.initials, 4),
		me.accent_colour,
		coalesce(left((select name from public.households where id = my_home), 30), ''),
		clean,
		photo
	)
	returning id into sent;
	return sent;
end;
$$;

-- Friends see each other's bio ---------------------------------------------------------------

drop function public.my_friends();

create function public.my_friends()
returns table (
	id uuid,
	name text,
	initials text,
	colour text,
	avatar_path text,
	bio text,
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
		p.bio,
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

revoke execute on function
	public.can_see_postcard(uuid),
	public.my_friends()
from public, anon;

grant execute on function
	public.can_see_postcard(uuid),
	public.my_friends()
to authenticated;
