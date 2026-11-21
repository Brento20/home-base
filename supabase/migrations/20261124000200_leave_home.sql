-- Leaving a home. The last person out takes the home with them: deleting it removes everything
-- in it (every table hangs off households with "on delete cascade"). If the last owner leaves
-- while others stay, whoever has been there longest becomes the owner, so a home is never
-- left without one.

create function public.leave_household()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := (select auth.uid());
	home uuid;
	was_owner boolean;
begin
	select household_id, role = 'owner' into home, was_owner
	from public.household_members
	where profile_id = caller;

	if home is null then
		raise exception 'You’re not in a home.';
	end if;

	if not exists (
		select 1 from public.household_members where household_id = home and profile_id <> caller
	) then
		delete from public.households where id = home;
		return;
	end if;

	delete from public.household_members where household_id = home and profile_id = caller;

	if was_owner and not exists (
		select 1 from public.household_members where household_id = home and role = 'owner'
	) then
		update public.household_members
		set role = 'owner'
		where household_id = home
			and profile_id = (
				select profile_id from public.household_members
				where household_id = home
				order by joined_at
				limit 1
			);
	end if;
end;
$$;

revoke execute on function public.leave_household() from public, anon;
grant execute on function public.leave_household() to authenticated;
