-- Splitting by shares is gone: equal, exact amounts and percent remain.
-- Any expense split by shares keeps exactly what each person owed, now recorded as exact amounts.

update public.expense_shares s
set split_input = s.owed_cents
from public.expenses e
where e.id = s.expense_id and e.split_method = 'shares';

update public.expenses set split_method = 'exact' where split_method = 'shares';

alter table public.expenses drop constraint expenses_split_method_check;
alter table public.expenses
	add constraint expenses_split_method_check check (split_method in ('equal', 'exact', 'percent'));
