-- Public profiles: a few lines about yourself that anyone signed in to home base may see, friends
-- or not, such as someone opening your friend link or a guest from another home on a plan you
-- share. Everything else about you stays with your home and your friends.
--
-- The public part is: your name, colour and initial, your pronouns, the line about you (bio), and
-- five short answers you choose to fill in. Your photo shows only to your home and your friends,
-- as before. Someone either of you has blocked sees nothing.

alter table public.profiles
	add column suburb text not null default '' check (char_length(suburb) <= 60),
	add column known_for text not null default '' check (char_length(known_for) <= 60),
	add column happy_to text not null default '' check (char_length(happy_to) <= 60),
	add column local_spot text not null default '' check (char_length(local_spot) <= 60),
	add column ask_me_about text not null default '' check (char_length(ask_me_about) <= 60);

create function public.public_profile(person uuid)
returns table (
	id uuid,
	name text,
	initials text,
	colour text,
	avatar_path text,
	pronouns text,
	bio text,
	suburb text,
	known_for text,
	happy_to text,
	local_spot text,
	ask_me_about text,
	home_name text,
	is_you boolean,
	is_friend boolean,
	shares_home boolean
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
		case
			when p.id = (select auth.uid()) or public.shares_household_with(p.id) or public.is_friend(p.id)
				then p.avatar_path
		end,
		p.pronouns,
		p.bio,
		p.suburb,
		p.known_for,
		p.happy_to,
		p.local_spot,
		p.ask_me_about,
		h.name,
		p.id = (select auth.uid()),
		public.is_friend(p.id),
		public.shares_household_with(p.id)
	from public.profiles p
	left join public.household_members m on m.profile_id = p.id
	left join public.households h on h.id = m.household_id
	where p.id = person
		and p.onboarded_at is not null
		and (select auth.uid()) is not null
		and not public.blocked_between((select auth.uid()), p.id);
$$;

-- A friend link now says whose it is, so a signed-in person can see their public profile first.
drop function public.preview_friend_link(text);

create function public.preview_friend_link(token text)
returns table (
	person uuid,
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
		l.created_by,
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

revoke execute on function public.public_profile(uuid), public.preview_friend_link(text)
from public, anon;
grant execute on function public.public_profile(uuid) to authenticated;
grant execute on function public.preview_friend_link(text) to anon, authenticated;
