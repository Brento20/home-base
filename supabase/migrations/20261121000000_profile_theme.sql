-- Appearance, kept with the person so it survives cleared cookies and follows them to a new
-- phone: light or dark, then the colour theme for the morning, the day and the evening, as
-- src/lib/ui/theme.ts writes it ("dark.tide.dune.ember"). Null means the default look.
-- People already edit their own profile row (policy "You can edit your own profile").

alter table public.profiles
	add column theme text
		check (theme ~ '^(dark|light)\.[a-z]{1,20}\.[a-z]{1,20}\.[a-z]{1,20}$');
