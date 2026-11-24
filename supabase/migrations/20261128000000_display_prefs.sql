-- Display preferences: each person's own ways to make home base calmer (less glow, steady
-- placeholders, no summary line, fewer cards on Today, a compact list). They belong to the
-- person, not the home, and live on their profile, which only they can change (the existing
-- "update your own profile" policy). The app reads what it recognises and defaults the rest
-- (src/lib/display.ts); here it only has to be a small object.

alter table public.profiles
	add column display_prefs jsonb not null default '{}'::jsonb
	constraint display_prefs_is_small_object
		check (jsonb_typeof(display_prefs) = 'object' and pg_column_size(display_prefs) <= 1024);
