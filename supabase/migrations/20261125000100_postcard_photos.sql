-- Photos on postcards. A postcard can be a photo, a message, or both.
--
-- The sender isn't in the home that receives it, so they can't put a file in that home's
-- folder. Instead they upload into their own folder (<sender id>/<file>), and send_postcard
-- checks the file is theirs and really there before attaching it. Who can see a postcard photo
-- follows the postcard: the home it was sent to and its sender. Either can remove the file.

alter table public.postcards
	add column photo_path text check (char_length(photo_path) <= 300),
	drop constraint postcards_body_check,
	add constraint postcards_body_length check (char_length(body) <= 500),
	add constraint postcards_not_empty check (char_length(body) > 0 or photo_path is not null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('postcard-photos', 'postcard-photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- True for your own uploads, and for a photo on a postcard sent to your home.
create function public.can_see_postcard_photo(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select split_part(object_name, '/', 1) = (select auth.uid())::text
		or exists (
			select 1
			from public.postcards p
			where p.photo_path = object_name
				and public.is_household_member(p.to_household)
		);
$$;

create policy "Senders and receiving homes can see postcard photos"
	on storage.objects for select
	to authenticated
	using (bucket_id = 'postcard-photos' and public.can_see_postcard_photo(name));

create policy "People upload postcard photos into their own folder"
	on storage.objects for insert
	to authenticated
	with check (
		bucket_id = 'postcard-photos' and split_part(name, '/', 1) = (select auth.uid())::text
	);

create policy "Senders and receiving homes can remove postcard photos"
	on storage.objects for delete
	to authenticated
	using (bucket_id = 'postcard-photos' and public.can_see_postcard_photo(name));

-- send_postcard now takes an optional photo: the path of a file the caller has just uploaded.
drop function public.send_postcard(uuid, text);

create function public.send_postcard(friend uuid, message text, photo text default null)
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
		to_household, from_profile, from_name, from_initials, from_colour, from_home, body, photo_path
	)
	values (
		their_home,
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

revoke execute on function
	public.can_see_postcard_photo(text),
	public.send_postcard(uuid, text, text)
from public, anon;

grant execute on function
	public.can_see_postcard_photo(text),
	public.send_postcard(uuid, text, text)
to authenticated;
