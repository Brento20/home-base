import { dbError } from '#lib/server/db.js';
import { avatarUrl } from '#lib/features/household/household.server.js';
import { sampleAccount, sampleProfiles } from '#lib/server/sample-data.js';
import { isValidDateISO, todayISO } from '#lib/time.js';
import { isLocalPath } from '#lib/local-path.js';
import type { AccountDetails, FieldErrors, ProfileField, ProfileValues } from '#lib/types.js';
import { photoExtension, PHOTO_TYPES, toBase64 } from '#lib/features/feed/photo-rules.js';
import { BIO_MAX } from '#lib/features/friends/public-profile.js';
import { isAvatarColour } from './colours.js';

/** Sign-up, sign-in and profile details for the signed-in person. */

export const PASSWORD_MIN = 10;
/** Profile photos are smaller than post photos: they're only ever shown as a circle. */
const PHOTO_MAX_BYTES = 1024 * 1024;

/** Shown for every sign-up outcome, so the form can't reveal who already has an account. */
export const CHECK_EMAIL = 'Check your email for a link to confirm your account.';

export function parseCredentials(form: FormData) {
	const email = String(form.get('email') ?? '').trim();
	const password = String(form.get('password') ?? '');
	const errors: FieldErrors<'email' | 'password'> = {};
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter your email address.';
	if (password.length < PASSWORD_MIN) errors.password = `Use at least ${PASSWORD_MIN} characters.`;
	return { email, password, errors, valid: Object.keys(errors).length === 0 };
}

/** Only same-site paths, so a link can't send someone off to another site after signing in. */
export function safeNext(value: string | null, fallback = '/') {
	return isLocalPath(value) ? value : fallback;
}

export async function getAccountDetails(locals: App.Locals): Promise<AccountDetails> {
	const { supabase, user } = locals;
	if (!supabase || !user) return { ...sampleAccount };

	const { data, error: readError } = await supabase
		.from('profiles')
		.select(
			'first_name, last_name, nickname, pronouns, date_of_birth, avatar_path, accent_colour, bio'
		)
		.eq('id', user.id)
		.single();

	if (readError) dbError(readError);

	return {
		email: user.email ?? '',
		firstName: data.first_name,
		lastName: data.last_name,
		nickname: data.nickname,
		pronouns: data.pronouns,
		dateOfBirth: data.date_of_birth ?? '',
		avatarUrl: avatarUrl(user.id, data.avatar_path),
		accentColour: data.accent_colour,
		bio: data.bio ?? ''
	};
}

/**
 * A form that edits one half of your profile (Edit profile, or Details and account) gets the
 * other half's fields filled in from what's saved, so parseProfileForm and saveProfile see the
 * whole profile and nothing is wiped. The photo stays unless the form changes it.
 */
export function withSavedDetails(form: FormData, saved: AccountDetails): FormData {
	const fields: Record<string, string> = {
		firstName: saved.firstName,
		lastName: saved.lastName,
		nickname: saved.nickname,
		pronouns: saved.pronouns,
		dateOfBirth: saved.dateOfBirth
	};
	for (const [name, value] of Object.entries(fields)) {
		if (!form.has(name)) form.set(name, value ?? '');
	}
	return form;
}

export function parseProfileForm(form: FormData) {
	const text = (name: string) => String(form.get(name) ?? '').trim();
	const values: ProfileValues = {
		firstName: text('firstName'),
		lastName: text('lastName'),
		nickname: text('nickname'),
		pronouns: text('pronouns'),
		dateOfBirth: text('dateOfBirth')
	};
	// Only on Edit your profile; a colour from the list or nothing.
	if (form.has('accentColour')) values.accentColour = text('accentColour').toLowerCase();
	// Only on Edit your profile too.
	if (form.has('bio')) values.bio = text('bio').replace(/\s+/g, ' ');
	const errors: FieldErrors<ProfileField> = {};

	if (!values.firstName) errors.firstName = 'Add your first name.';
	else if (values.firstName.length > 40) errors.firstName = 'Keep it under 40 characters.';
	if (!values.lastName) errors.lastName = 'Add your last name.';
	else if (values.lastName.length > 40) errors.lastName = 'Keep it under 40 characters.';
	if (!values.nickname) errors.nickname = 'Add what people call you.';
	else if (values.nickname.length > 24) errors.nickname = 'Keep it under 24 characters.';
	if (values.pronouns.length > 24) errors.pronouns = 'Keep it under 24 characters.';
	if (values.bio !== undefined && values.bio.length > BIO_MAX)
		errors.bio = `Keep it under ${BIO_MAX} characters.`;
	if (values.accentColour !== undefined && !isAvatarColour(values.accentColour))
		errors.accentColour = 'Pick one of the colours.';

	if (!values.dateOfBirth) errors.dateOfBirth = 'Add your date of birth.';
	else if (
		!isValidDateISO(values.dateOfBirth) ||
		values.dateOfBirth < '1900-01-01' ||
		values.dateOfBirth > todayISO()
	)
		errors.dateOfBirth = 'Check that date.';

	const upload = form.get('photo');
	const photo = upload instanceof File && upload.size > 0 ? upload : null;
	if (photo && !PHOTO_TYPES.includes(photo.type)) errors.photo = 'Use a JPEG, PNG or WebP photo.';
	else if (photo && photo.size > PHOTO_MAX_BYTES) errors.photo = 'That photo is too big.';

	const removePhoto = form.get('removePhoto') === 'on';

	return { values, photo, removePhoto, errors, valid: Object.keys(errors).length === 0 };
}

const firstLetter = (name: string) => (Array.from(name)[0] ?? '').toUpperCase();

/** The profile's two halves, for pages that edit one (ProfileForm's `part`). */
export const PRIVATE_FIELDS = ['firstName', 'lastName', 'pronouns', 'dateOfBirth'] as const;

/**
 * Saves the profile, swaps the photo if there's a new one, and marks onboarding done. `part`
 * limits it to one half: 'profile' (photo, nickname, colour, the line about you) leaves the
 * private columns alone, so a missing birthday can't block it; 'details' leaves the photo.
 */
export async function saveProfile(
	locals: App.Locals,
	values: ProfileValues,
	photo: File | null,
	removePhoto: boolean,
	part: 'all' | 'profile' | 'details' = 'all'
): Promise<{ photoError?: string }> {
	const { supabase, user } = locals;
	if (!supabase || !user) {
		// Sample mode keeps the photo in memory as a data URL, so the flow can be tried offline.
		const sampleAvatar = photo
			? `data:${photo.type};base64,${toBase64(new Uint8Array(await photo.arrayBuffer()))}`
			: removePhoto
				? null
				: sampleProfiles[0].avatarUrl;
		const kept =
			part === 'profile'
				? Object.fromEntries(
						Object.entries(values).filter(
							([key]) => !(PRIVATE_FIELDS as readonly string[]).includes(key)
						)
					)
				: values;
		Object.assign(sampleAccount, kept, { avatarUrl: sampleAvatar });
		Object.assign(sampleProfiles[0], {
			...(values.accentColour ? { accentColour: values.accentColour } : {}),
			displayName: values.nickname,
			initials: firstLetter(values.nickname),
			avatarUrl: sampleAvatar
		});
		return {};
	}

	const { data: current } = await supabase
		.from('profiles')
		.select('avatar_path')
		.eq('id', user.id)
		.single();
	const oldPath = current?.avatar_path ?? null;

	let avatarPath = removePhoto ? null : oldPath;
	let photoError: string | undefined;

	if (photo) {
		// A new name every time, so phones don't keep showing the old photo.
		const path = `${user.id}/avatar-${Date.now()}.${photoExtension(photo.type)}`;
		const { error: uploadError } = await supabase.storage
			.from('avatars')
			.upload(path, photo, { contentType: photo.type, upsert: false });
		if (uploadError) photoError = 'That photo didn’t upload. Try again.';
		else avatarPath = path;
	}

	const { error: saveError } = await supabase
		.from('profiles')
		.update({
			...(part !== 'profile'
				? {
						first_name: values.firstName,
						last_name: values.lastName,
						pronouns: values.pronouns,
						date_of_birth: values.dateOfBirth
					}
				: {}),
			nickname: values.nickname,
			display_name: values.nickname,
			initials: firstLetter(values.nickname),
			avatar_path: avatarPath,
			...(values.accentColour ? { accent_colour: values.accentColour } : {}),
			...(values.bio !== undefined ? { bio: values.bio } : {})
		})
		.eq('id', user.id);

	if (saveError) dbError(saveError);

	await supabase
		.from('profiles')
		.update({ onboarded_at: new Date().toISOString() })
		.eq('id', user.id)
		.is('onboarded_at', null);

	if (oldPath && oldPath !== avatarPath) await supabase.storage.from('avatars').remove([oldPath]);

	return { photoError };
}
