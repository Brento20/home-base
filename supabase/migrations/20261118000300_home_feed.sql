-- The home feed: quick updates, photos and plans everyone in the home sees on Today.
--
-- A post is a short message, a photo, or both. Anyone in the home can reply (replies stay with
-- the post) and react (one reaction each, so a heart is an acknowledgement, not a counter).
-- A plan made from a post keeps a link back to it, so the conversation and the plan stay together.
-- Photos live in the private feed-photos bucket under the home's id.

-- Posts ---------------------------------------------------------------------------------------

create table public.feed_posts (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	author_id uuid references public.profiles (id) on delete set null default auth.uid(),
	body text not null default '' check (char_length(body) <= 1000),
	photo_path text check (char_length(photo_path) <= 300),
	created_at timestamptz not null default now(),
	constraint feed_posts_not_empty check (char_length(body) > 0 or photo_path is not null)
);

-- Newest first, a page at a time.
create index feed_posts_household_created_idx on public.feed_posts (household_id, created_at desc);

alter table public.feed_posts enable row level security;

create policy "Members can see household posts"
	on public.feed_posts for select
	to authenticated
	using (public.is_household_member(household_id));

create policy "Members can post as themselves"
	on public.feed_posts for insert
	to authenticated
	with check (public.is_household_member(household_id) and author_id = (select auth.uid()));

create policy "People can remove their own posts"
	on public.feed_posts for delete
	to authenticated
	using (author_id = (select auth.uid()) and public.is_household_member(household_id));

-- True when the post belongs to a home the caller is in. Replies and reactions don't repeat the
-- home's id, so their policies ask through the post.
create function public.can_see_feed_post(target_post uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1
		from public.feed_posts post
		where post.id = target_post
			and public.is_household_member(post.household_id)
	);
$$;

-- Replies -------------------------------------------------------------------------------------

create table public.feed_replies (
	id uuid primary key default gen_random_uuid(),
	post_id uuid not null references public.feed_posts (id) on delete cascade,
	author_id uuid references public.profiles (id) on delete set null default auth.uid(),
	body text not null check (char_length(body) between 1 and 1000),
	created_at timestamptz not null default now()
);

create index feed_replies_post_created_idx on public.feed_replies (post_id, created_at);

alter table public.feed_replies enable row level security;

create policy "Members can see replies"
	on public.feed_replies for select
	to authenticated
	using (public.can_see_feed_post(post_id));

create policy "Members can reply as themselves"
	on public.feed_replies for insert
	to authenticated
	with check (public.can_see_feed_post(post_id) and author_id = (select auth.uid()));

create policy "People can remove their own replies"
	on public.feed_replies for delete
	to authenticated
	using (author_id = (select auth.uid()));

-- Reactions -----------------------------------------------------------------------------------

create table public.feed_reactions (
	post_id uuid not null references public.feed_posts (id) on delete cascade,
	profile_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
	reaction text not null check (reaction in ('heart', 'thumbs_up', 'laugh', 'thanks')),
	created_at timestamptz not null default now(),
	-- One each: picking another reaction replaces yours.
	primary key (post_id, profile_id)
);

alter table public.feed_reactions enable row level security;

create policy "Members can see reactions"
	on public.feed_reactions for select
	to authenticated
	using (public.can_see_feed_post(post_id));

create policy "Members can react as themselves"
	on public.feed_reactions for insert
	to authenticated
	with check (public.can_see_feed_post(post_id) and profile_id = (select auth.uid()));

create policy "People can change their own reaction"
	on public.feed_reactions for update
	to authenticated
	using (profile_id = (select auth.uid()))
	with check (public.can_see_feed_post(post_id) and profile_id = (select auth.uid()));

create policy "People can take back their own reaction"
	on public.feed_reactions for delete
	to authenticated
	using (profile_id = (select auth.uid()));

-- Plans made from a post ----------------------------------------------------------------------

alter table public.plans
	add column post_id uuid references public.feed_posts (id) on delete set null;

create index plans_post_idx on public.plans (post_id) where post_id is not null;

-- A plan can only link to a post from its own home.
create function public.check_plan_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	if new.post_id is not null and not exists (
		select 1 from public.feed_posts
		where id = new.post_id and household_id = new.household_id
	) then
		raise exception 'That post belongs to another home.' using errcode = '23514';
	end if;
	return new;
end;
$$;

create trigger plans_check_post
	before insert or update of post_id, household_id on public.plans
	for each row execute function public.check_plan_post();

-- Photos --------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feed-photos', 'feed-photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- True when the file's folder is a home the caller is in. Photos are stored as
-- <household id>/<file>, so the first folder names the home.
create function public.can_use_feed_photo(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
	folder text := split_part(object_name, '/', 1);
begin
	if folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
		return false;
	end if;
	return public.is_household_member(folder::uuid);
end;
$$;

create policy "Members can see their home's feed photos"
	on storage.objects for select
	to authenticated
	using (bucket_id = 'feed-photos' and public.can_use_feed_photo(name));

create policy "Members can add feed photos to their home"
	on storage.objects for insert
	to authenticated
	with check (bucket_id = 'feed-photos' and public.can_use_feed_photo(name));

create policy "People can remove feed photos they added"
	on storage.objects for delete
	to authenticated
	using (bucket_id = 'feed-photos' and owner_id = (select auth.uid())::text);
