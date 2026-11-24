-- Pronouns are private for now: they show to you and the people you live with, not to friends
-- or anyone else looking at your public profile. Same function and columns as before
-- (20261126000000_friend_requests.sql), so callers don't change; pronouns just come back empty
-- for people outside your home.

create or replace function public.public_profile(person uuid)
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
	shares_home boolean,
	request_sent boolean,
	request_received boolean
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
		case
			when p.id = (select auth.uid()) or public.shares_household_with(p.id) then p.pronouns
		end,
		p.bio,
		p.suburb,
		p.known_for,
		p.happy_to,
		p.local_spot,
		p.ask_me_about,
		h.name,
		p.id = (select auth.uid()),
		public.is_friend(p.id),
		public.shares_household_with(p.id),
		exists (
			select 1 from public.friend_requests r
			where r.from_profile = (select auth.uid()) and r.to_profile = p.id
		),
		exists (
			select 1 from public.friend_requests r
			where r.from_profile = p.id and r.to_profile = (select auth.uid())
		)
	from public.profiles p
	left join public.household_members m on m.profile_id = p.id
	left join public.households h on h.id = m.household_id
	where p.id = person
		and p.onboarded_at is not null
		and (select auth.uid()) is not null
		and not public.blocked_between((select auth.uid()), p.id);
$$;
