-- Inviting friends' homes to a plan.
--
-- Anyone in a home can invite a friend to one of its plans. The invite goes to the friend's
-- whole home: everyone there sees the plan in their Plans (it stays the inviting home's plan, so
-- only that home can change or delete it). Each person answers for themselves, Going or Not
-- going; nobody answers for anyone else. Everyone on the plan, in either home, sees who's going,
-- who isn't and who hasn't replied.
--
-- Once a plan is over, two people from different homes who both said Going can become friends
-- with one tap: they've met, so there's no friend link to send.

create table public.plan_invites (
	plan_id uuid not null references public.plans (id) on delete cascade,
	-- The home that's invited.
	household_id uuid not null references public.households (id) on delete cascade,
	-- The friend it was sent to, and who sent it.
	invited_profile uuid references public.profiles (id) on delete set null,
	invited_by uuid references public.profiles (id) on delete set null default auth.uid(),
	-- Names as they were, since neither home can look the other up.
	guest_home text not null default '' check (char_length(guest_home) <= 30),
	host_home text not null default '' check (char_length(host_home) <= 30),
	invited_by_name text not null default '' check (char_length(invited_by_name) <= 60),
	created_at timestamptz not null default now(),
	primary key (plan_id, household_id)
);

create index plan_invites_household_idx on public.plan_invites (household_id);

create table public.plan_responses (
	plan_id uuid not null references public.plans (id) on delete cascade,
	profile_id uuid not null references public.profiles (id) on delete cascade,
	response text not null check (response in ('going', 'not_going')),
	updated_at timestamptz not null default now(),
	primary key (plan_id, profile_id)
);

-- Which home a plan belongs to (for policies that mustn't read plans through its own policy).
create function public.plan_home(target uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
	select household_id from public.plans where id = target;
$$;

-- True when the caller's home was invited to the plan.
create function public.is_invited_to_plan(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1
		from public.plan_invites i
		where i.plan_id = target and public.is_household_member(i.household_id)
	);
$$;

-- The plan's own home, or a home invited to it.
create function public.can_see_plan(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select public.is_household_member(public.plan_home(target)) or public.is_invited_to_plan(target);
$$;

create policy "Invited homes can see plans they're invited to"
	on public.plans for select
	to authenticated
	using (public.is_invited_to_plan(id));

alter table public.plan_invites enable row level security;

-- The plan's home sees every home it invited; an invited home sees its own invite.
create policy "Plan homes and invited homes see invites"
	on public.plan_invites for select
	to authenticated
	using (
		public.is_household_member(household_id)
		or public.is_household_member(public.plan_home(plan_id))
	);

alter table public.plan_responses enable row level security;

create policy "Everyone on a plan sees its answers"
	on public.plan_responses for select
	to authenticated
	using (public.can_see_plan(plan_id));

-- When a plan is over: the end time, or for an all-day plan the end of its day (a day after it
-- starts), or an hour after a plan with no end time starts.
create function public.plan_is_over(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select coalesce(
		p.ends_at,
		case when p.all_day then p.starts_at + interval '1 day' else p.starts_at + interval '1 hour' end
	) < now()
	from public.plans p
	where p.id = target;
$$;

-- Invites a friend's home to one of your home's plans. Whoever invites is marked Going (they
-- can change it). Inviting the same home twice changes nothing.
create function public.invite_to_plan(target uuid, friend uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_has_profile();
	host uuid := public.plan_home(target);
	guest uuid;
begin
	if host is null or not public.is_household_member(host) then
		raise exception 'Only the home the plan belongs to can invite people.';
	end if;
	if not public.is_friend(friend) or public.blocked_between(caller, friend) then
		raise exception 'You can only invite friends.';
	end if;
	select household_id into guest from public.household_members where profile_id = friend;
	if guest is null then
		raise exception 'They’re not in a home yet, so there’s nowhere to send it.';
	end if;
	if guest = host then
		raise exception 'They live here: the plan’s already on their Plans.';
	end if;
	if (select count(*) from public.plan_invites where plan_id = target) >= 10 then
		raise exception 'That’s ten homes invited already.';
	end if;

	insert into public.plan_invites (
		plan_id, household_id, invited_profile, invited_by, guest_home, host_home, invited_by_name
	)
	values (
		target,
		guest,
		friend,
		caller,
		coalesce(left((select name from public.households where id = guest), 30), ''),
		coalesce(left((select name from public.households where id = host), 30), ''),
		left(public.public_name(caller), 60)
	)
	on conflict do nothing;

	insert into public.plan_responses (plan_id, profile_id, response)
	values (target, caller, 'going')
	on conflict do nothing;
end;
$$;

-- Takes a home off a plan (the plan's home only). Their answers go with it.
create function public.uninvite_from_plan(target uuid, guest_household uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
	if not public.is_household_member(public.plan_home(target)) then
		raise exception 'Only the home the plan belongs to can change who’s invited.';
	end if;
	delete from public.plan_invites where plan_id = target and household_id = guest_household;
	delete from public.plan_responses r
	using public.household_members m
	where r.plan_id = target and m.profile_id = r.profile_id and m.household_id = guest_household;
end;
$$;

-- Your answer: 'going', 'not_going', or null to take it back.
create function public.respond_to_plan(target uuid, answer text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_has_profile();
begin
	if not public.can_see_plan(target) then
		raise exception 'That plan isn’t one you can see.';
	end if;
	if answer is null then
		delete from public.plan_responses where plan_id = target and profile_id = caller;
		return;
	end if;
	if answer not in ('going', 'not_going') then
		raise exception 'Answer going or not going.';
	end if;
	insert into public.plan_responses (plan_id, profile_id, response, updated_at)
	values (target, caller, answer, now())
	on conflict (plan_id, profile_id) do update set response = excluded.response, updated_at = now();
end;
$$;

-- Everyone on a plan: the plan's home and every invited home, each person with their answer
-- (null for no reply), and whether you can add them as a friend now (you both went, it's over,
-- you're in different homes, you're not friends yet, and neither has blocked the other).
create function public.plan_guest_list(target uuid)
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
			and not public.blocked_between((select auth.uid()), p.id)
		)
	from people
	join public.profiles p on p.id = people.profile_id
	join public.households hh on hh.id = people.household_id
	left join public.plan_responses r on r.plan_id = target and r.profile_id = p.id
	where public.can_see_plan(target)
	order by people.is_host desc, hh.name, lower(public.public_name(p.id));
$$;

-- Friends with someone you went to a plan with, no link needed (see plan_guest_list's can_add).
create function public.add_friend_from_plan(target uuid, other_profile uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_has_profile();
begin
	if not exists (
		select 1 from public.plan_guest_list(target) g where g.profile_id = other_profile and g.can_add
	) then
		raise exception 'You can add people who went too, once the plan’s over.';
	end if;
	insert into public.friendships (profile_a, profile_b)
	values (least(caller, other_profile), greatest(caller, other_profile))
	on conflict do nothing;
end;
$$;

revoke execute on function
	public.plan_home(uuid),
	public.is_invited_to_plan(uuid),
	public.can_see_plan(uuid),
	public.plan_is_over(uuid),
	public.invite_to_plan(uuid, uuid),
	public.uninvite_from_plan(uuid, uuid),
	public.respond_to_plan(uuid, text),
	public.plan_guest_list(uuid),
	public.add_friend_from_plan(uuid, uuid)
from public, anon;

grant execute on function
	public.plan_home(uuid),
	public.is_invited_to_plan(uuid),
	public.can_see_plan(uuid),
	public.invite_to_plan(uuid, uuid),
	public.uninvite_from_plan(uuid, uuid),
	public.respond_to_plan(uuid, text),
	public.plan_guest_list(uuid),
	public.add_friend_from_plan(uuid, uuid)
to authenticated;
