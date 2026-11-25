-- Recurring bills: rent, internet and power that add themselves to a money group on their day,
-- already split, so nobody has to remember. A recurring bill is a template (what, how much,
-- who paid, the shares) plus a rhythm (weekly to yearly) counted from its first date, so a bill
-- on the 31st stays on the 31st (or the month's last day), rather than drifting earlier.
--
-- Bills come due when someone opens Money or Today: add_due_recurring_expenses() adds every
-- bill whose day has come, through save_expense() so the usual checks apply (shares add up,
-- everyone's in the group). It locks each bill while it works and each date can only be added
-- once, so two phones opening at the same moment can't double up. A bill that can no longer be
-- added as it stands (someone left the group) pauses itself, for someone to fix.

create function public.next_recurring_date(start_on date, frequency text, steps integer)
returns date
language sql
immutable
set search_path = ''
as $$
	select case frequency
		when 'weekly' then start_on + 7 * steps
		when 'fortnightly' then start_on + 14 * steps
		when 'monthly' then (start_on + make_interval(months => steps))::date
		when 'quarterly' then (start_on + make_interval(months => 3 * steps))::date
		when 'yearly' then (start_on + make_interval(years => steps))::date
	end;
$$;

create table public.recurring_expenses (
	id uuid primary key default gen_random_uuid(),
	group_id uuid not null references public.expense_groups (id) on delete cascade,
	description text not null check (char_length(description) between 1 and 80),
	amount_cents integer not null check (amount_cents between 1 and 100000000),
	paid_by uuid not null references public.profiles (id),
	category text not null default 'other' check (
		category in (
			'rent', 'groceries', 'utilities', 'internet', 'eating_out',
			'events', 'transport', 'household', 'other'
		)
	),
	split_method text not null default 'equal'
		check (split_method in ('equal', 'exact', 'percent', 'shares')),
	-- As save_expense() takes them: [{ profile_id, owed_cents, split_input }], adding up to the amount.
	shares jsonb not null
		check (jsonb_typeof(shares) = 'array' and jsonb_array_length(shares) between 1 and 50),
	frequency text not null
		check (frequency in ('weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly')),
	start_on date not null,
	-- How many dates from start_on have been added (or skipped as before the bill began repeating).
	added_count integer not null default 0 check (added_count >= 0),
	-- The next date to add; kept in step with start_on, frequency and added_count by a trigger.
	next_on date not null,
	paused boolean not null default false,
	created_by uuid default auth.uid() references public.profiles (id) on delete set null,
	created_at timestamptz not null default now()
);

create index recurring_expenses_due_idx on public.recurring_expenses (group_id, next_on)
	where not paused;

create function public.recurring_expenses_set_next()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.next_on := public.next_recurring_date(new.start_on, new.frequency, new.added_count);
	return new;
end;
$$;

create trigger recurring_expenses_set_next
	before insert or update of start_on, frequency, added_count on public.recurring_expenses
	for each row execute function public.recurring_expenses_set_next();

alter table public.recurring_expenses enable row level security;

create policy "Members can see their group's recurring bills"
	on public.recurring_expenses for select to authenticated
	using (public.is_expense_group_member(group_id));
create policy "Members can add recurring bills"
	on public.recurring_expenses for insert to authenticated
	with check (
		public.is_expense_group_member(group_id)
		and public.is_expense_group_member(group_id, paid_by)
	);
create policy "Members can change recurring bills"
	on public.recurring_expenses for update to authenticated
	using (public.is_expense_group_member(group_id))
	with check (
		public.is_expense_group_member(group_id)
		and public.is_expense_group_member(group_id, paid_by)
	);
create policy "Members can stop recurring bills"
	on public.recurring_expenses for delete to authenticated
	using (public.is_expense_group_member(group_id));

-- Which recurring bill an expense came from (kept when the bill stops: it still happened).
alter table public.expenses
	add column recurring_id uuid references public.recurring_expenses (id) on delete set null;

create unique index expenses_recurring_once on public.expenses (recurring_id, spent_on)
	where recurring_id is not null;

-- Starts a recurring bill from an expense dated `expense_spent_on`: that expense is added now,
-- and the bill repeats from there. Dates between it and today aren't filled in (if you start
-- your rent from September, you get September's, then December's): only what you typed, and
-- what's ahead. Returns the bill's id.
create function public.start_recurring_expense(
	target_group uuid,
	expense_description text,
	expense_amount_cents integer,
	expense_paid_by uuid,
	expense_spent_on date,
	expense_category text,
	expense_split_method text,
	shares jsonb,
	bill_frequency text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
	bill uuid;
	saved uuid;
	today date;
	steps integer := 1;
begin
	select (now() at time zone h.time_zone)::date into today
	from public.expense_groups g
	join public.households h on h.id = g.household_id
	where g.id = target_group;
	if today is null then
		raise exception 'That group doesn’t exist any more.';
	end if;

	-- Skip past every date up to today, so the next one is still ahead.
	while public.next_recurring_date(expense_spent_on, bill_frequency, steps) <= today loop
		steps := steps + 1;
	end loop;

	insert into public.recurring_expenses (
		group_id, description, amount_cents, paid_by, category, split_method, shares,
		frequency, start_on, added_count
	)
	values (
		target_group, btrim(expense_description), expense_amount_cents, expense_paid_by,
		expense_category, expense_split_method, shares, bill_frequency, expense_spent_on, steps
	)
	returning id into bill;

	saved := public.save_expense(
		null, target_group, expense_description, expense_amount_cents, expense_paid_by,
		expense_spent_on, expense_category, expense_split_method, shares
	);
	update public.expenses set recurring_id = bill where id = saved;
	return bill;
end;
$$;

-- Adds every recurring bill that's come due in the groups you're in, up to 24 dates a bill at
-- a time (two years of a monthly bill). Returns how many expenses it added.
create function public.add_due_recurring_expenses()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
	bill record;
	today date;
	saved uuid;
	added integer := 0;
	rounds integer;
begin
	for bill in
		select r.*, (now() at time zone h.time_zone)::date as local_today
		from public.recurring_expenses r
		join public.expense_groups g on g.id = r.group_id
		join public.households h on h.id = g.household_id
		where not r.paused
			and r.next_on <= (now() at time zone h.time_zone)::date
		for update of r skip locked
	loop
		today := bill.local_today;
		rounds := 0;
		while bill.next_on <= today and rounds < 24 loop
			begin
				saved := public.save_expense(
					null, bill.group_id, bill.description, bill.amount_cents, bill.paid_by,
					bill.next_on, bill.category, bill.split_method, bill.shares
				);
				update public.expenses set recurring_id = bill.id where id = saved;
				added := added + 1;
			exception
				when unique_violation then
					-- Already added for this date (another phone got there first): move on.
					null;
				when others then
					-- Can't be added as it stands (someone left the group): pause it to be fixed.
					update public.recurring_expenses set paused = true where id = bill.id;
					exit;
			end;
			bill.added_count := bill.added_count + 1;
			bill.next_on := public.next_recurring_date(bill.start_on, bill.frequency, bill.added_count);
			update public.recurring_expenses set added_count = bill.added_count where id = bill.id;
			rounds := rounds + 1;
		end loop;
	end loop;
	return added;
end;
$$;

revoke execute on function
	public.start_recurring_expense(uuid, text, integer, uuid, date, text, text, jsonb, text),
	public.add_due_recurring_expenses()
from public, anon;

grant execute on function
	public.start_recurring_expense(uuid, text, integer, uuid, date, text, text, jsonb, text),
	public.add_due_recurring_expenses()
to authenticated;
