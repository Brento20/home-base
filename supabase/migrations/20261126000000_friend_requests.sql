-- Adding friends without leaving the app: friend requests and friend codes.
--
-- A friend request waits in the other person's Requests until they accept or decline it; nobody
-- becomes your friend without saying yes. You can send one from anyone's public profile, or by
-- typing their friend code: six letters and numbers on their profile (like FIG-42Q), which they
-- can swap for a new one whenever they like. If two people ask each other, they're friends.
--
-- Limits keep it from being abused: ten requests a day, twenty code look-ups a day (so codes
-- can't be guessed), nothing at all between people where either has blocked the other, and
-- blocking clears any requests between you.

create table public.friend_requests (
	from_profile uuid not null references public.profiles (id) on delete cascade,
	to_profile uuid not null references public.profiles (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (from_profile, to_profile),
	constraint friend_requests_not_yourself check (from_profile <> to_profile)
);

create index friend_requests_to_idx on public.friend_requests (to_profile, created_at desc);

alter table public.friend_requests enable row level security;

create policy "You see requests you've sent and received"
	on public.friend_requests for select
	to authenticated
	using ((select auth.uid()) in (from_profile, to_profile));

-- Friend codes ---------------------------------------------------------------------------------

alter table public.profiles
	add column friend_code text unique check (friend_code ~ '^[A-Z2-9]{3}-[A-Z2-9]{3}$');

-- Each look-up by code, kept a day, so a script can't try codes until one fits.
create table public.friend_code_attempts (
	profile_id uuid not null references public.profiles (id) on delete cascade,
	tried_at timestamptz not null default now()
);

create index friend_code_attempts_idx on public.friend_code_attempts (profile_id, tried_at desc);

alter table public.friend_code_attempts enable row level security;
-- No policies: only the functions below touch it.

-- A fresh code nobody has. Letters and numbers that can't be mistaken for each other (no 0/O, 1/I/L).
create function public.new_friend_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
	alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
	code text;
begin
	loop
		code := '';
		for i in 1..6 loop
			code := code || substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 31), 1);
			if i = 3 then
				code := code || '-';
			end if;
		end loop;
		exit when not exists (select 1 from public.profiles where friend_code = code);
	end loop;
	return code;
end;
$$;

-- Your code, made the first time you look.
create function public.my_friend_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_has_profile();
	code text;
begin
	select friend_code into code from public.profiles where id = caller;
	if code is null then
		code := public.new_friend_code();
		update public.profiles set friend_code = code where id = caller;
	end if;
	return code;
end;
$$;

-- A new code; the old one stops working at once.
create function public.reset_friend_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_has_profile();
	code text := public.new_friend_code();
begin
	update public.profiles set friend_code = code where id = caller;
	return code;
end;
$$;

-- Requests ---------------------------------------------------------------------------------------

-- Asks someone to be friends. Returns 'sent', or 'friends' if they'd already asked you (then
-- you're friends straight away).
create function public.send_friend_request(person uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_has_profile();
begin
	if person = caller then
		raise exception 'That’s you.';
	end if;
	if not exists (select 1 from public.profiles where id = person and onboarded_at is not null)
		or public.blocked_between(caller, person) then
		raise exception 'You can’t send them a request.';
	end if;
	if public.is_friend(person) then
		return 'friends';
	end if;
	if public.shares_household_with(person) then
		raise exception 'You live together already.';
	end if;

	-- They asked you first: say yes.
	if exists (select 1 from public.friend_requests where from_profile = person and to_profile = caller) then
		insert into public.friendships (profile_a, profile_b)
		values (least(caller, person), greatest(caller, person))
		on conflict do nothing;
		return 'friends';
	end if;

	if exists (select 1 from public.friend_requests where from_profile = caller and to_profile = person) then
		return 'sent';
	end if;
	if (
		select count(*) from public.friend_requests
		where from_profile = caller and created_at > now() - interval '1 day'
	) >= 10 then
		raise exception 'That’s ten requests today. Send more tomorrow.';
	end if;

	insert into public.friend_requests (from_profile, to_profile) values (caller, person);
	return 'sent';
end;
$$;

-- Asks the person with this code. Twenty look-ups a day. A code that's mistyped or matches nobody
-- comes back as a result, not an error: an error would undo the record of the attempt, and then
-- wrong guesses wouldn't count towards the limit.
-- result: 'sent', 'friends', 'not_found' or 'bad_code'.
create function public.send_friend_request_by_code(code text)
returns table (result text, person uuid, name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_has_profile();
	tidy text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
	found uuid;
begin
	if (
		select count(*) from public.friend_code_attempts
		where profile_id = caller and tried_at > now() - interval '1 day'
	) >= 20 then
		raise exception 'That’s a lot of codes today. Try again tomorrow.';
	end if;
	insert into public.friend_code_attempts (profile_id) values (caller);
	delete from public.friend_code_attempts where tried_at < now() - interval '1 day';

	if char_length(tidy) <> 6 then
		return query select 'bad_code'::text, null::uuid, null::text;
		return;
	end if;
	select id into found
	from public.profiles
	where friend_code = substr(tidy, 1, 3) || '-' || substr(tidy, 4, 3);
	if found is null or public.blocked_between(caller, found) then
		return query select 'not_found'::text, null::uuid, null::text;
		return;
	end if;

	return query select public.send_friend_request(found), found, public.public_name(found);
end;
$$;

-- Yes or no to a request someone sent you.
create function public.answer_friend_request(person uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_has_profile();
begin
	if not exists (select 1 from public.friend_requests where from_profile = person and to_profile = caller) then
		raise exception 'That request has gone.';
	end if;
	if accept and not public.blocked_between(caller, person) then
		insert into public.friendships (profile_a, profile_b)
		values (least(caller, person), greatest(caller, person))
		on conflict do nothing;
	end if;
	delete from public.friend_requests where from_profile = person and to_profile = caller;
end;
$$;

create function public.cancel_friend_request(person uuid)
returns void
language sql
security definer
set search_path = ''
as $$
	delete from public.friend_requests where from_profile = (select auth.uid()) and to_profile = person;
$$;

-- Requests waiting on you and ones you've sent, with what a public profile shows.
create function public.my_friend_requests()
returns table (
	person uuid,
	name text,
	initials text,
	colour text,
	home_name text,
	incoming boolean,
	created_at timestamptz
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
		h.name,
		r.to_profile = (select auth.uid()),
		r.created_at
	from public.friend_requests r
	join public.profiles p
		on p.id = case when r.to_profile = (select auth.uid()) then r.from_profile else r.to_profile end
	left join public.household_members m on m.profile_id = p.id
	left join public.households h on h.id = m.household_id
	where (select auth.uid()) in (r.from_profile, r.to_profile)
	order by r.created_at desc;
$$;

-- However two people become friends (link, request, plan), any requests between them are done.
create function public.clear_friend_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	delete from public.friend_requests
	where (from_profile = new.profile_a and to_profile = new.profile_b)
		or (from_profile = new.profile_b and to_profile = new.profile_a);
	return new;
end;
$$;

create trigger friendships_clear_requests
	after insert on public.friendships
	for each row execute function public.clear_friend_requests();

-- Blocking clears requests between you too.
create or replace function public.block_person(other_profile uuid)
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

	delete from public.friend_requests
	where (from_profile = caller and to_profile = other_profile)
		or (from_profile = other_profile and to_profile = caller);

	delete from public.postcards
	where from_profile = other_profile
		and to_household in (select household_id from public.household_members where profile_id = caller);
end;
$$;

-- Public profiles say whether there's a request either way ------------------------------------

drop function public.public_profile(uuid);

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

revoke execute on function
	public.new_friend_code(),
	public.my_friend_code(),
	public.reset_friend_code(),
	public.send_friend_request(uuid),
	public.send_friend_request_by_code(text),
	public.answer_friend_request(uuid, boolean),
	public.cancel_friend_request(uuid),
	public.my_friend_requests(),
	public.public_profile(uuid)
from public, anon;

grant execute on function
	public.my_friend_code(),
	public.reset_friend_code(),
	public.send_friend_request(uuid),
	public.send_friend_request_by_code(text),
	public.answer_friend_request(uuid, boolean),
	public.cancel_friend_request(uuid),
	public.my_friend_requests(),
	public.public_profile(uuid)
to authenticated;
