-- Secret notes are sealed by the app before they're saved (AES-256-GCM, key in the Worker's
-- NOTES_KEY secret, src/lib/server/sealed.ts), so the database holds "enc:v1:…" rather than
-- the Wi-Fi password. Sealed text is longer than what was typed: a 2,000-character note can
-- seal to about 11,000, so sealed bodies get their own limit.

alter table public.home_notes drop constraint home_notes_body_check;
alter table public.home_notes add constraint home_notes_body_check check (
	char_length(body) <= 2000
	or (body like 'enc:v1:%' and char_length(body) <= 12000)
);

-- Notes saved before the key existed are sealed the first time the app reads them. That isn't
-- an edit, so the note keeps its "updated" time (and its place in the list).
create function public.touch_home_note()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	if new.title = old.title
		and new.is_secret = old.is_secret
		and old.body not like 'enc:v1:%'
		and new.body like 'enc:v1:%' then
		new.updated_at = old.updated_at;
	else
		new.updated_at = now();
	end if;
	return new;
end;
$$;

drop trigger home_notes_touch_updated_at on public.home_notes;
create trigger home_notes_touch_updated_at
	before update on public.home_notes
	for each row execute function public.touch_home_note();
