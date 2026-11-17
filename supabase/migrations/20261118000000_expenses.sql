-- Shared expenses, Splitwise style.
--
-- A home can have several expense groups ("Our Place", "Car"), each with its own members chosen
-- from the people in the home. Members add expenses (who paid, who's included, how it's split) and
-- record repayments ("settlements"). Balances are worked out from both: what you paid, minus your
-- share of everything, plus repayments you made, minus repayments you received.
--
-- Money is stored as whole cents (integer) so nothing is lost to rounding.

-- Groups ----------------------------------------------------------------------------------------

create table public.expense_groups (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null references public.households (id) on delete cascade,
	name text not null check (char_length(name) between 1 and 40),
	created_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now()
);

create index expense_groups_household_id_idx on public.expense_groups (household_id);

create table public.expense_group_members (
	group_id uuid not null references public.expense_groups (id) on delete cascade,
	profile_id uuid not null references public.profiles (id) on delete cascade,
	joined_at timestamptz not null default now(),
	primary key (group_id, profile_id)
);

create index expense_group_members_profile_id_idx on public.expense_group_members (profile_id);

-- Whether a person (the caller by default) is in a group. Security definer so policies on the
-- members table can use it without recursing into themselves.
create function public.is_expense_group_member(
	target_group uuid,
	target_profile uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1
		from public.expense_group_members
		where group_id = target_group
			and profile_id = coalesce(target_profile, (select auth.uid()))
	);
$$;

alter table public.expense_groups enable row level security;
alter table public.expense_group_members enable row level security;

create policy "Members can see their groups"
	on public.expense_groups for select
	to authenticated
	using (public.is_expense_group_member(id));

create policy "Members can rename their groups"
	on public.expense_groups for update
	to authenticated
	using (public.is_expense_group_member(id))
	with check (public.is_expense_group_member(id));

create policy "Members can see who else is in their groups"
	on public.expense_group_members for select
	to authenticated
	using (public.is_expense_group_member(group_id));

-- Groups and members are only created through these two functions, which check that everyone
-- added lives in the same home.

create function public.create_expense_group(
	target_household uuid,
	group_name text,
	member_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
	caller uuid := (select auth.uid());
	clean_name text := btrim(group_name);
	everyone uuid[] := array(select distinct unnest(array_append(member_ids, caller)));
	new_group uuid;
begin
	if caller is null or not public.is_household_member(target_household) then
		raise exception 'You can only make groups in your own home.';
	end if;
	if char_length(clean_name) not between 1 and 40 then
		raise exception 'Give the group a name under 40 characters.';
	end if;
	if exists (
		select 1 from unnest(everyone) as person (id)
		where not exists (
			select 1 from public.household_members m
			where m.household_id = target_household and m.profile_id = person.id
		)
	) then
		raise exception 'Everyone in a group has to live in your home.';
	end if;

	insert into public.expense_groups (household_id, name, created_by)
	values (target_household, clean_name, caller)
	returning id into new_group;

	insert into public.expense_group_members (group_id, profile_id)
	select new_group, person from unnest(everyone) as person;

	return new_group;
end;
$$;

create function public.add_expense_group_members(target_group uuid, member_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	home uuid := (select household_id from public.expense_groups where id = target_group);
begin
	if not public.is_expense_group_member(target_group) then
		raise exception 'Only people in the group can add others.';
	end if;
	if exists (
		select 1 from unnest(member_ids) as person (id)
		where not exists (
			select 1 from public.household_members m
			where m.household_id = home and m.profile_id = person.id
		)
	) then
		raise exception 'Everyone in a group has to live in your home.';
	end if;

	insert into public.expense_group_members (group_id, profile_id)
	select target_group, person from unnest(member_ids) as person
	on conflict do nothing;
end;
$$;

-- Expenses --------------------------------------------------------------------------------------

create table public.expenses (
	id uuid primary key default gen_random_uuid(),
	group_id uuid not null references public.expense_groups (id) on delete cascade,
	description text not null check (char_length(description) between 1 and 80),
	amount_cents integer not null check (amount_cents between 1 and 100000000),
	paid_by uuid not null references public.profiles (id),
	spent_on date not null,
	category text not null default 'other' check (
		category in (
			'rent', 'groceries', 'utilities', 'internet', 'eating_out',
			'events', 'transport', 'household', 'other'
		)
	),
	split_method text not null default 'equal'
		check (split_method in ('equal', 'exact', 'percent', 'shares')),
	created_by uuid default auth.uid() references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index expenses_group_spent_idx on public.expenses (group_id, spent_on desc);

create trigger expenses_touch_updated_at
	before update on public.expenses
	for each row execute function public.touch_updated_at();

-- Each person's part of an expense. owed_cents always adds up to the expense's amount;
-- split_input keeps what was typed (a percentage, a number of shares or an exact amount) so the
-- form can be reopened as it was.
create table public.expense_shares (
	expense_id uuid not null references public.expenses (id) on delete cascade,
	profile_id uuid not null references public.profiles (id),
	owed_cents integer not null check (owed_cents >= 0),
	split_input numeric(12, 2),
	primary key (expense_id, profile_id)
);

create index expense_shares_profile_id_idx on public.expense_shares (profile_id);

-- Repayments. paid_by sent money to paid_to outside the app; recording it moves the balance.
create table public.settlements (
	id uuid primary key default gen_random_uuid(),
	group_id uuid not null references public.expense_groups (id) on delete cascade,
	paid_by uuid not null references public.profiles (id),
	paid_to uuid not null references public.profiles (id),
	amount_cents integer not null check (amount_cents between 1 and 100000000),
	paid_on date not null,
	created_by uuid default auth.uid() references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	check (paid_by <> paid_to)
);

create index settlements_group_paid_idx on public.settlements (group_id, paid_on desc);

-- Everyone named on an expense or repayment has to be in its group.
create function public.check_expense_people()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
	target_group uuid;
begin
	if tg_table_name = 'expenses' then
		if not public.is_expense_group_member(new.group_id, new.paid_by) then
			raise exception 'Whoever paid has to be in the group.';
		end if;
	elsif tg_table_name = 'expense_shares' then
		select group_id into target_group from public.expenses where id = new.expense_id;
		if not public.is_expense_group_member(target_group, new.profile_id) then
			raise exception 'Everyone sharing an expense has to be in the group.';
		end if;
	elsif tg_table_name = 'settlements' then
		if not public.is_expense_group_member(new.group_id, new.paid_by)
			or not public.is_expense_group_member(new.group_id, new.paid_to) then
			raise exception 'Both people in a repayment have to be in the group.';
		end if;
	end if;
	return new;
end;
$$;

create trigger expenses_check_people
	before insert or update on public.expenses
	for each row execute function public.check_expense_people();

create trigger expense_shares_check_people
	before insert or update on public.expense_shares
	for each row execute function public.check_expense_people();

create trigger settlements_check_people
	before insert or update on public.settlements
	for each row execute function public.check_expense_people();

alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.settlements enable row level security;

create policy "Members can read expenses"
	on public.expenses for select to authenticated
	using (public.is_expense_group_member(group_id));
create policy "Members can add expenses"
	on public.expenses for insert to authenticated
	with check (public.is_expense_group_member(group_id));
create policy "Members can edit expenses"
	on public.expenses for update to authenticated
	using (public.is_expense_group_member(group_id))
	with check (public.is_expense_group_member(group_id));
create policy "Members can delete expenses"
	on public.expenses for delete to authenticated
	using (public.is_expense_group_member(group_id));

-- Shares follow their expense.
create function public.can_use_expense(target_expense uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1 from public.expenses e
		where e.id = target_expense and public.is_expense_group_member(e.group_id)
	);
$$;

create policy "Members can read shares"
	on public.expense_shares for select to authenticated
	using (public.can_use_expense(expense_id));
create policy "Members can add shares"
	on public.expense_shares for insert to authenticated
	with check (public.can_use_expense(expense_id));
create policy "Members can edit shares"
	on public.expense_shares for update to authenticated
	using (public.can_use_expense(expense_id))
	with check (public.can_use_expense(expense_id));
create policy "Members can delete shares"
	on public.expense_shares for delete to authenticated
	using (public.can_use_expense(expense_id));

create policy "Members can read repayments"
	on public.settlements for select to authenticated
	using (public.is_expense_group_member(group_id));
create policy "Members can record repayments"
	on public.settlements for insert to authenticated
	with check (public.is_expense_group_member(group_id));
create policy "Members can delete repayments"
	on public.settlements for delete to authenticated
	using (public.is_expense_group_member(group_id));

-- Saves an expense and its shares together, so a half-saved expense can't exist. Runs as the
-- caller, so the policies above still decide what they may touch. The app works out the shares;
-- this checks they add up.
create function public.save_expense(
	target_expense uuid,
	target_group uuid,
	expense_description text,
	expense_amount_cents integer,
	expense_paid_by uuid,
	expense_spent_on date,
	expense_category text,
	expense_split_method text,
	shares jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
	saved uuid;
begin
	if jsonb_array_length(shares) = 0 then
		raise exception 'Include at least one person.';
	end if;
	if (select sum((s ->> 'owed_cents')::integer) from jsonb_array_elements(shares) s)
		<> expense_amount_cents then
		raise exception 'The shares don’t add up to the total.';
	end if;

	if target_expense is null then
		insert into public.expenses (
			group_id, description, amount_cents, paid_by, spent_on, category, split_method
		)
		values (
			target_group, btrim(expense_description), expense_amount_cents, expense_paid_by,
			expense_spent_on, expense_category, expense_split_method
		)
		returning id into saved;
	else
		update public.expenses
		set description = btrim(expense_description),
			amount_cents = expense_amount_cents,
			paid_by = expense_paid_by,
			spent_on = expense_spent_on,
			category = expense_category,
			split_method = expense_split_method
		where id = target_expense and group_id = target_group
		returning id into saved;

		if saved is null then
			raise exception 'That expense doesn’t exist any more.';
		end if;
		delete from public.expense_shares where expense_id = saved;
	end if;

	insert into public.expense_shares (expense_id, profile_id, owed_cents, split_input)
	select saved, (s ->> 'profile_id')::uuid, (s ->> 'owed_cents')::integer,
		nullif(s ->> 'split_input', '')::numeric
	from jsonb_array_elements(shares) s;

	return saved;
end;
$$;

-- Each member's balance in a group, in cents. Positive: the group owes them. Negative: they owe.
create function public.expense_group_balances(target_group uuid)
returns table (profile_id uuid, net_cents bigint)
language sql
stable
security invoker
set search_path = ''
as $$
	select m.profile_id,
		coalesce((select sum(e.amount_cents) from public.expenses e
			where e.group_id = target_group and e.paid_by = m.profile_id), 0)
		- coalesce((select sum(s.owed_cents) from public.expense_shares s
			join public.expenses e on e.id = s.expense_id
			where e.group_id = target_group and s.profile_id = m.profile_id), 0)
		+ coalesce((select sum(t.amount_cents) from public.settlements t
			where t.group_id = target_group and t.paid_by = m.profile_id), 0)
		- coalesce((select sum(t.amount_cents) from public.settlements t
			where t.group_id = target_group and t.paid_to = m.profile_id), 0)
		as net_cents
	from public.expense_group_members m
	where m.group_id = target_group;
$$;

revoke execute on function
	public.create_expense_group(uuid, text, uuid[]),
	public.add_expense_group_members(uuid, uuid[]),
	public.save_expense(uuid, uuid, text, integer, uuid, date, text, text, jsonb),
	public.expense_group_balances(uuid)
from public, anon;

grant execute on function
	public.create_expense_group(uuid, text, uuid[]),
	public.add_expense_group_members(uuid, uuid[]),
	public.save_expense(uuid, uuid, text, integer, uuid, date, text, text, jsonb),
	public.expense_group_balances(uuid)
to authenticated;
