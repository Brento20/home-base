-- Tightening from a review of friends, postcards, plan invites and public profiles.
--
-- 1. Blocking hides people everywhere. Public profiles already did; now a plan's guest list
--    leaves out anyone you've blocked or who has blocked you (you still see yourself).
-- 2. Postcard photos: the sender uploads before sending, so uploads had no limit of their own.
--    Now at most 40 a day per person, matching the 20-postcards-a-day limit with room for retries.

create or replace function public.plan_guest_list(target uuid)
returns table (
	profile_id uuid,
	name text,
	initials text,
	colour text,
	avatar_path text,
	home_name text,
	is_host_home boolean,
	response text,
	is_you boolean,
	can_add boolean
)
language sql
stable
security definer
set search_path = ''
as $$
	with homes as (
		select public.plan_home(target) as household_id, true as is_host
		union all
		select i.household_id, false from public.plan_invites i where i.plan_id = target
	),
	people as (
		select m.profile_id, m.household_id, h.is_host
		from homes h
		join public.household_members m on m.household_id = h.household_id
	),
	mine as (
		select response from public.plan_responses
		where plan_id = target and profile_id = (select auth.uid())
	)
	select
		p.id,
		public.public_name(p.id),
		p.initials,
		p.accent_colour,
		case
			when p.id = (select auth.uid()) or public.shares_household_with(p.id) or public.is_friend(p.id)
				then p.avatar_path
		end,
		hh.name,
		people.is_host,
		r.response,
		p.id = (select auth.uid()),
		(
			(select response from mine) = 'going'
			and r.response = 'going'
			and public.plan_is_over(target)
			and p.id <> (select auth.uid())
			and not public.shares_household_with(p.id)
			and not public.is_friend(p.id)
		)
	from people
	join public.profiles p on p.id = people.profile_id
	join public.households hh on hh.id = people.household_id
	left join public.plan_responses r on r.plan_id = target and r.profile_id = p.id
	where public.can_see_plan(target)
		and (p.id = (select auth.uid()) or not public.blocked_between((select auth.uid()), p.id))
	order by people.is_host desc, hh.name, lower(public.public_name(p.id));
$$;

drop policy "People upload postcard photos into their own folder" on storage.objects;

create policy "People upload postcard photos into their own folder"
	on storage.objects for insert
	to authenticated
	with check (
		bucket_id = 'postcard-photos'
		and split_part(name, '/', 1) = (select auth.uid())::text
		and (
			select count(*)
			from storage.objects mine
			where mine.bucket_id = 'postcard-photos'
				and split_part(mine.name, '/', 1) = (select auth.uid())::text
				and mine.created_at > now() - interval '1 day'
		) < 40
	);
