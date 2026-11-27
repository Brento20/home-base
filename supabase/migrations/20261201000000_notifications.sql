-- Notifications: one row per person per thing worth telling them about, for the notification
-- centre at the top of Home and for the phone's own notifications (web push).
--
-- The database writes them, from triggers on the tables where things happen, so nothing is
-- missed whichever screen made the change: a friend request, a postcard, a reply or a react, a
-- plan invite or someone's answer to one, an expense or a repayment, a job handed to you.
-- The app words them (src/lib/features/notifications/describe.ts), so a row keeps the facts:
-- who, what kind, and the thing's title, amount or date.
--
-- Pushes go out from the Worker straight after the action that caused them, under the signed-in
-- person's own session (claim_my_pushes), so no server-wide key is needed. Each phone that's
-- turned notifications on has a push subscription, with its own choice of kinds and quiet hours.

create table public.notifications (
	id uuid primary key default gen_random_uuid(),
	-- Who it's for.
	profile_id uuid not null references public.profiles (id) on delete cascade,
	kind text not null check (
		kind in (
			'friend_request', 'friend_accepted',
			'postcard', 'postcard_reply', 'postcard_reaction',
			'feed_post', 'feed_reply', 'feed_reaction',
			'plan_invite', 'plan_response',
			'expense', 'settlement',
			'task_assigned'
		)
	),
	-- Who did it, and how they're named and drawn, copied so the recipient needn't be able to
	-- read their profile (a friend in another home, say).
	actor_id uuid references public.profiles (id) on delete set null,
	actor_name text not null default '' check (char_length(actor_name) <= 60),
	actor_initials text not null default '' check (char_length(actor_initials) <= 4),
	actor_colour text not null default '#d6dce2' check (char_length(actor_colour) <= 9),
	-- The thing it's about (a post, a plan, a postcard), for replacing an older one about the
	-- same thing: a changed react, a changed answer.
	subject_id text not null default '' check (char_length(subject_id) <= 80),
	-- Its title or the start of its words.
	subject text not null default '' check (char_length(subject) <= 160),
	-- A little more: the react, the answer ('going'), 'yours' or 'thread' for replies, the host's
	-- home for an invite, 'to_you' or 'from_you' for a repayment.
	detail text not null default '' check (char_length(detail) <= 60),
	-- Where: the money group, or the home a plan's at.
	place text not null default '' check (char_length(place) <= 60),
	amount_cents integer,
	currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
	-- A plan's start, or a job's due day.
	starts_at timestamptz,
	-- Where tapping it goes, inside the app.
	url text not null default '/' check (url ~ '^/[A-Za-z0-9/_?=&.-]*$' and char_length(url) <= 200),
	created_at timestamptz not null default now(),
	read_at timestamptz,
	pushed_at timestamptz
);

create index notifications_profile_idx on public.notifications (profile_id, created_at desc);
create index notifications_unpushed_idx on public.notifications (actor_id, created_at)
	where pushed_at is null;

alter table public.notifications enable row level security;

create policy "You can see your notifications"
	on public.notifications for select
	to authenticated
	using (profile_id = (select auth.uid()));

create policy "You can clear your notifications"
	on public.notifications for delete
	to authenticated
	using (profile_id = (select auth.uid()));

-- No insert or update policies: triggers write them, and mark_notifications_read marks them.

-- A phone that's turned notifications on. The endpoint is the push service's address for this
-- app on that phone; p256dh and auth are the keys its messages are sealed with.
create table public.push_subscriptions (
	id uuid primary key default gen_random_uuid(),
	profile_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
	endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
	p256dh text not null check (char_length(p256dh) between 60 and 120),
	auth text not null check (char_length(auth) between 16 and 40),
	-- Which kinds this phone wants (see notification_group below).
	groups text[] not null default array['friends', 'postcards', 'posts', 'plans', 'money', 'jobs']
		check (groups <@ array['friends', 'postcards', 'posts', 'plans', 'money', 'jobs']),
	-- Hours (0 to 23) between which it stays quiet, in this phone's time zone. Both or neither.
	quiet_from smallint check (quiet_from between 0 and 23),
	quiet_to smallint check (quiet_to between 0 and 23),
	time_zone text not null default 'Australia/Sydney' check (public.is_time_zone(time_zone)),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint push_quiet_both check ((quiet_from is null) = (quiet_to is null))
);

create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

create policy "You can see your phones"
	on public.push_subscriptions for select
	to authenticated
	using (profile_id = (select auth.uid()));

create policy "You can change your phones' settings"
	on public.push_subscriptions for update
	to authenticated
	using (profile_id = (select auth.uid()))
	with check (profile_id = (select auth.uid()));

create policy "You can turn a phone off"
	on public.push_subscriptions for delete
	to authenticated
	using (profile_id = (select auth.uid()));

-- Adding one goes through save_push_subscription, which hands a phone over cleanly when someone
-- else signs in on it.

-- Which setting a kind falls under.
create function public.notification_group(kind text)
returns text
language sql
immutable
set search_path = ''
as $$
	select case
		when kind like 'friend_%' then 'friends'
		when kind like 'postcard%' then 'postcards'
		when kind like 'feed_%' then 'posts'
		when kind like 'plan_%' then 'plans'
		when kind in ('expense', 'settlement') then 'money'
		else 'jobs'
	end;
$$;

-- Writes one, unless it's to yourself or between people who've blocked each other. Kinds that
-- can change (a react, an answer, a request) replace the last one from the same person about the
-- same thing, so changing your mind doesn't stack them up.
create function public.notify(
	recipient uuid,
	what text,
	actor uuid,
	about text,
	link text,
	subject text default '',
	detail text default '',
	place text default '',
	amount integer default null,
	money text default null,
	starts timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	person public.profiles;
begin
	if recipient is null or actor is null or recipient = actor then
		return;
	end if;
	if public.blocked_between(actor, recipient) then
		return;
	end if;
	if what in ('feed_reaction', 'postcard_reaction', 'plan_response', 'friend_request') then
		delete from public.notifications n
		where n.profile_id = recipient and n.kind = what and n.subject_id = about and n.actor_id = actor;
	end if;
	select * into person from public.profiles where id = actor;
	insert into public.notifications (
		profile_id, kind, actor_id, actor_name, actor_initials, actor_colour,
		subject_id, subject, detail, place, amount_cents, currency, starts_at, url
	)
	values (
		recipient, what, actor, left(public.public_name(actor), 60),
		left(coalesce(person.initials, ''), 4), coalesce(person.accent_colour, '#d6dce2'),
		left(coalesce(about, ''), 80), left(coalesce(subject, ''), 160), left(coalesce(detail, ''), 60),
		left(coalesce(place, ''), 60), amount, money, starts, link
	);
end;
$$;

-- Friend requests: one waiting on you, and gone again once it's answered or withdrawn.
create function public.notify_friend_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	if tg_op = 'INSERT' then
		perform public.notify(new.to_profile, 'friend_request', new.from_profile, new.from_profile::text, '/profile');
		return new;
	end if;
	delete from public.notifications
	where profile_id = old.to_profile and kind = 'friend_request' and actor_id = old.from_profile;
	return old;
end;
$$;

create trigger friend_requests_notify
	after insert or delete on public.friend_requests
	for each row execute function public.notify_friend_request();

-- Now friends: tells whoever didn't just say yes (or ask back).
create function public.notify_friendship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := (select auth.uid());
	other uuid;
begin
	if caller is null then
		return new;
	end if;
	other := case when caller = new.profile_a then new.profile_b else new.profile_a end;
	perform public.notify(other, 'friend_accepted', caller, caller::text, '/people/' || caller::text);
	return new;
end;
$$;

create trigger friendships_notify
	after insert on public.friendships
	for each row execute function public.notify_friendship();

-- A postcard: everyone in the home it was sent to.
create function public.notify_postcard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	member uuid;
begin
	for member in
		select profile_id from public.household_members where household_id = new.to_household
	loop
		perform public.notify(
			member, 'postcard', new.from_profile, new.id::text, '/postcards/' || new.id::text,
			left(new.body, 160)
		);
	end loop;
	return new;
end;
$$;

create trigger postcards_notify
	after insert on public.postcards
	for each row execute function public.notify_postcard();

-- A reply on a postcard: to its sender when the home replies, to the home when the sender does.
create function public.notify_postcard_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	card public.postcards;
	member uuid;
begin
	select * into card from public.postcards where id = new.postcard_id;
	if card.id is null or new.author_id is null then
		return new;
	end if;
	if new.author_id = card.from_profile then
		for member in
			select profile_id from public.household_members where household_id = card.to_household
		loop
			perform public.notify(
				member, 'postcard_reply', new.author_id, card.id::text, '/postcards/' || card.id::text,
				left(new.body, 160)
			);
		end loop;
	else
		perform public.notify(
			card.from_profile, 'postcard_reply', new.author_id, card.id::text,
			'/postcards/' || card.id::text, left(new.body, 160), 'yours'
		);
	end if;
	return new;
end;
$$;

create trigger postcard_replies_notify
	after insert on public.postcard_replies
	for each row execute function public.notify_postcard_reply();

-- A react on a postcard: to its sender.
create function public.notify_postcard_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	card public.postcards;
begin
	select * into card from public.postcards where id = new.postcard_id;
	if card.id is null then
		return new;
	end if;
	perform public.notify(
		card.from_profile, 'postcard_reaction', new.profile_id, card.id::text,
		'/postcards/' || card.id::text, left(card.body, 160), new.reaction
	);
	return new;
end;
$$;

create trigger postcard_reactions_notify
	after insert or update of reaction on public.postcard_reactions
	for each row execute function public.notify_postcard_reaction();

-- A new post: everyone else in the home.
create function public.notify_feed_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	member uuid;
begin
	for member in
		select profile_id from public.household_members where household_id = new.household_id
	loop
		perform public.notify(
			member, 'feed_post', new.author_id, new.id::text, '/feed/' || new.id::text,
			left(new.body, 160)
		);
	end loop;
	return new;
end;
$$;

create trigger feed_posts_notify
	after insert on public.feed_posts
	for each row execute function public.notify_feed_post();

-- A reply: to whoever posted, and to anyone else who's replied.
create function public.notify_feed_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	post public.feed_posts;
	person uuid;
begin
	select * into post from public.feed_posts where id = new.post_id;
	if post.id is null then
		return new;
	end if;
	perform public.notify(
		post.author_id, 'feed_reply', new.author_id, post.id::text, '/feed/' || post.id::text,
		left(new.body, 160), 'yours'
	);
	for person in
		select distinct author_id from public.feed_replies
		where post_id = post.id and author_id is not null and author_id is distinct from post.author_id
	loop
		perform public.notify(
			person, 'feed_reply', new.author_id, post.id::text, '/feed/' || post.id::text,
			left(new.body, 160), 'thread'
		);
	end loop;
	return new;
end;
$$;

create trigger feed_replies_notify
	after insert on public.feed_replies
	for each row execute function public.notify_feed_reply();

-- A react on a post: to whoever posted it.
create function public.notify_feed_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	post public.feed_posts;
begin
	select * into post from public.feed_posts where id = new.post_id;
	if post.id is null then
		return new;
	end if;
	perform public.notify(
		post.author_id, 'feed_reaction', new.profile_id, post.id::text, '/feed/' || post.id::text,
		left(post.body, 160), new.reaction
	);
	return new;
end;
$$;

create trigger feed_reactions_notify
	after insert or update of reaction on public.feed_reactions
	for each row execute function public.notify_feed_reaction();

-- An invite to a plan: everyone in the home that's invited.
create function public.notify_plan_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	plan public.plans;
	member uuid;
begin
	select * into plan from public.plans where id = new.plan_id;
	if plan.id is null then
		return new;
	end if;
	for member in
		select profile_id from public.household_members where household_id = new.household_id
	loop
		perform public.notify(
			member, 'plan_invite', new.invited_by, plan.id::text, '/plans/' || plan.id::text,
			plan.title, '', new.host_home, starts => plan.starts_at
		);
	end loop;
	return new;
end;
$$;

create trigger plan_invites_notify
	after insert on public.plan_invites
	for each row execute function public.notify_plan_invite();

-- Someone's answer to a plan: everyone in the home that's hosting it.
create function public.notify_plan_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	plan public.plans;
	member uuid;
begin
	select * into plan from public.plans where id = new.plan_id;
	if plan.id is null then
		return new;
	end if;
	for member in
		select profile_id from public.household_members where household_id = plan.household_id
	loop
		perform public.notify(
			member, 'plan_response', new.profile_id, plan.id::text, '/plans/' || plan.id::text,
			plan.title, new.response, starts => plan.starts_at
		);
	end loop;
	return new;
end;
$$;

create trigger plan_responses_notify
	after insert or update of response on public.plan_responses
	for each row execute function public.notify_plan_response();

-- An expense: everyone else in the group.
create function public.notify_expense()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	grp record;
	member uuid;
begin
	select g.name, h.currency into grp
	from public.expense_groups g join public.households h on h.id = g.household_id
	where g.id = new.group_id;
	for member in
		select profile_id from public.expense_group_members where group_id = new.group_id
	loop
		perform public.notify(
			member, 'expense', coalesce(new.created_by, new.paid_by), new.id::text,
			'/money/' || new.group_id::text, new.description, '', coalesce(grp.name, ''),
			new.amount_cents, grp.currency
		);
	end loop;
	return new;
end;
$$;

create trigger expenses_notify
	after insert on public.expenses
	for each row execute function public.notify_expense();

-- A repayment: to whichever of the two didn't record it.
create function public.notify_settlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	grp record;
	actor uuid := coalesce(new.created_by, new.paid_by);
begin
	select g.name, h.currency into grp
	from public.expense_groups g join public.households h on h.id = g.household_id
	where g.id = new.group_id;
	perform public.notify(
		new.paid_to, 'settlement', actor, new.id::text, '/money/' || new.group_id::text,
		'', 'to_you', coalesce(grp.name, ''), new.amount_cents, grp.currency
	);
	perform public.notify(
		new.paid_by, 'settlement', actor, new.id::text, '/money/' || new.group_id::text,
		'', 'from_you', coalesce(grp.name, ''), new.amount_cents, grp.currency
	);
	return new;
end;
$$;

create trigger settlements_notify
	after insert on public.settlements
	for each row execute function public.notify_settlement();

-- A job handed to you by someone else. Not the next round of a repeating job (spawned when the
-- last one's ticked off), which is the same job coming round again.
create function public.notify_task_assigned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := (select auth.uid());
begin
	if new.assignee_id is null or new.completed_at is not null or caller is null then
		return new;
	end if;
	if tg_op = 'INSERT' and new.spawned_from is not null then
		return new;
	end if;
	if tg_op = 'UPDATE' and old.assignee_id is not distinct from new.assignee_id then
		return new;
	end if;
	perform public.notify(
		new.assignee_id, 'task_assigned', caller, new.id::text, '/lists/tasks/' || new.id::text,
		new.title, starts => new.due_on::timestamptz
	);
	return new;
end;
$$;

create trigger tasks_notify
	after insert or update of assignee_id on public.tasks
	for each row execute function public.notify_task_assigned();

-- Marks yours read: these ones, or all of them. Also tidies away ones over two months old.
create function public.mark_notifications_read(which uuid[] default null)
returns void
language sql
security definer
set search_path = ''
as $$
	update public.notifications
	set read_at = now()
	where profile_id = (select auth.uid())
		and read_at is null
		and (which is null or id = any (which));
	delete from public.notifications
	where profile_id = (select auth.uid()) and created_at < now() - interval '60 days';
$$;

-- Turns notifications on for this phone, as you. A phone someone else had turned on (a shared
-- iPad, an account switch) comes over to you with its settings reset.
create function public.save_push_subscription(
	endpoint text,
	p256dh text,
	auth text,
	time_zone text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := public.assert_has_profile();
	saved uuid;
begin
	delete from public.push_subscriptions s
	where s.endpoint = save_push_subscription.endpoint and s.profile_id <> caller;
	insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth, time_zone)
	values (
		caller, save_push_subscription.endpoint, save_push_subscription.p256dh,
		save_push_subscription.auth,
		case when public.is_time_zone(save_push_subscription.time_zone)
			then save_push_subscription.time_zone else 'Australia/Sydney' end
	)
	on conflict on constraint push_subscriptions_endpoint_key do update
	set p256dh = excluded.p256dh, auth = excluded.auth, time_zone = excluded.time_zone,
		updated_at = now()
	returning id into saved;
	return saved;
end;
$$;

-- The pushes your last action set off: notifications you caused in the last quarter hour that
-- haven't gone out, each with the phones of the person it's for that want that kind and aren't
-- in their quiet hours, and how many they now have unread (the app icon's badge). Marks them
-- sent as it hands them over, so each goes out once. Only ever your own doing.
create function public.claim_my_pushes()
returns table (
	notification_id uuid,
	recipient uuid,
	kind text,
	actor_name text,
	subject text,
	detail text,
	place text,
	amount_cents integer,
	currency text,
	starts_at timestamptz,
	url text,
	unread integer,
	endpoint text,
	p256dh text,
	auth text,
	time_zone text
)
language sql
security definer
set search_path = ''
as $$
	with claimed as (
		update public.notifications
		set pushed_at = now()
		where actor_id = (select auth.uid())
			and pushed_at is null
			and created_at > now() - interval '15 minutes'
		returning *
	)
	select
		c.id, c.profile_id, c.kind, c.actor_name, c.subject, c.detail, c.place, c.amount_cents,
		c.currency, c.starts_at, c.url,
		(
			select count(*)::integer from public.notifications u
			where u.profile_id = c.profile_id and u.read_at is null
		),
		s.endpoint, s.p256dh, s.auth, s.time_zone
	from claimed c
	join public.push_subscriptions s on s.profile_id = c.profile_id
	where public.notification_group(c.kind) = any (s.groups)
		and (
			s.quiet_from is null
			or not (
				case
					when s.quiet_from <= s.quiet_to then
						extract(hour from now() at time zone s.time_zone) >= s.quiet_from
						and extract(hour from now() at time zone s.time_zone) < s.quiet_to
					else
						extract(hour from now() at time zone s.time_zone) >= s.quiet_from
						or extract(hour from now() at time zone s.time_zone) < s.quiet_to
				end
			)
		);
$$;

-- A phone whose subscription the push service says is gone (uninstalled, turned off in iOS
-- Settings). Anyone signed in may report one: the address is all it takes, and it's only ever
-- seen by the server sending to it.
create function public.drop_push_subscription(endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
	delete from public.push_subscriptions s where s.endpoint = drop_push_subscription.endpoint;
$$;

revoke execute on function
	public.notify(uuid, text, uuid, text, text, text, text, text, integer, text, timestamptz),
	public.notify_friend_request(),
	public.notify_friendship(),
	public.notify_postcard(),
	public.notify_postcard_reply(),
	public.notify_postcard_reaction(),
	public.notify_feed_post(),
	public.notify_feed_reply(),
	public.notify_feed_reaction(),
	public.notify_plan_invite(),
	public.notify_plan_response(),
	public.notify_expense(),
	public.notify_settlement(),
	public.notify_task_assigned()
from public, anon, authenticated;

revoke execute on function
	public.mark_notifications_read(uuid[]),
	public.save_push_subscription(text, text, text, text),
	public.claim_my_pushes(),
	public.drop_push_subscription(text)
from public, anon;

grant execute on function
	public.mark_notifications_read(uuid[]),
	public.save_push_subscription(text, text, text, text),
	public.claim_my_pushes(),
	public.drop_push_subscription(text)
to authenticated;
