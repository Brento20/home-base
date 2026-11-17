-- Weekly chores, past tasks and lists that finish themselves.

-- Tasks ----------------------------------------------------------------------------------------

alter table public.tasks
	add column repeat text not null default 'none' check (repeat in ('none', 'weekly')),
	-- The occurrence whose completion created this one, so Undo can take it back.
	add column spawned_from uuid references public.tasks (id) on delete set null;

create index tasks_spawned_from_idx on public.tasks (spawned_from) where spawned_from is not null;

-- Ticks a task off. For a weekly chore it also adds the next one: a week after it was due,
-- moved forward week by week until it lands after today. Returns the new task's id, if any.
-- Security invoker, so the caller's row-level security still applies.
create function public.complete_task(target_task uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
	done public.tasks;
	today date := (now() at time zone 'Australia/Sydney')::date;
	next_due date;
	next_id uuid;
begin
	update public.tasks
	set completed_at = now()
	where id = target_task and completed_at is null
	returning * into done;

	if not found or done.repeat <> 'weekly' then
		return null;
	end if;

	next_due := coalesce(done.due_on, today) + 7;
	while next_due <= today loop
		next_due := next_due + 7;
	end loop;

	insert into public.tasks (household_id, title, notes, assignee_id, due_on, repeat, spawned_from)
	values (done.household_id, done.title, done.notes, done.assignee_id, next_due, 'weekly', done.id)
	returning id into next_id;

	return next_id;
end;
$$;

-- Undoes a tick. Removes the next weekly occurrence it created, as long as nobody has ticked
-- that one off yet.
create function public.reopen_task(target_task uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
	update public.tasks set completed_at = null where id = target_task;
	delete from public.tasks where spawned_from = target_task and completed_at is null;
end;
$$;

grant execute on function public.complete_task(uuid) to authenticated;
grant execute on function public.reopen_task(uuid) to authenticated;

-- Lists ----------------------------------------------------------------------------------------

-- Set when every item is ticked; cleared again when an item is unticked or added.
alter table public.lists add column completed_at timestamptz;

create index lists_household_completed_idx on public.lists (household_id, completed_at);

create function public.refresh_list_completion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
	target uuid := coalesce(new.list_id, old.list_id);
	total integer;
	open integer;
begin
	select count(*), count(*) filter (where not checked)
	into total, open
	from public.list_items
	where list_id = target;

	update public.lists
	set completed_at = case
		when total > 0 and open = 0 then coalesce(completed_at, now())
		else null
	end
	where id = target;

	return null;
end;
$$;

create trigger list_items_refresh_completion
	after insert or update of checked or delete on public.list_items
	for each row execute function public.refresh_list_completion();

-- Lists can be deleted from the app now that there can be several.
create policy "Members can remove household lists"
	on public.lists for delete
	to authenticated
	using (public.is_household_member(household_id));
