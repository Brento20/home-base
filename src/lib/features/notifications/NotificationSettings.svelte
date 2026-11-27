<script lang="ts">
	/**
	 * Notifications on this phone: a button to turn them on (iOS only asks from a tap, and only
	 * in the app on the Home Screen), then which kinds this phone gets, quiet hours, and
	 * off. Each phone chooses for itself, so Chris's settings are Chris's.
	 *
	 * The phone's push subscription is saved through /notifications/phone. Sample mode pretends
	 * to have one, so the settings can be seen and tried.
	 */
	import { onMount } from 'svelte';
	import { NOTIFICATION_GROUPS, type NotificationGroup, type PhoneSettings } from './describe.js';

	interface Props {
		/** The app's public push key; null when the server isn't set up for pushes. */
		pushKey: string | null;
		sampleMode: boolean;
	}

	let { pushKey, sampleMode }: Props = $props();

	type Stage = 'checking' | 'not-set-up' | 'install' | 'unsupported' | 'blocked' | 'off' | 'on';
	let stage = $state<Stage>('checking');
	let settings = $state<PhoneSettings | null>(null);
	let endpoint = $state<string | null>(null);
	let busy = $state(false);
	let note = $state<string | null>(null);

	const SAMPLE_PHONE = 'https://web.push.apple.com/sample-phone';
	const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
	const hourLabel = (hour: number) =>
		`${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'am' : 'pm'}`;

	async function call(method: string, payload: object) {
		const response = await fetch('/notifications/phone', {
			method,
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});
		if (!response.ok) throw new Error((await response.json().catch(() => null))?.message);
		return response.json();
	}

	const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

	function keyBytes(base64url: string) {
		const padded = base64url.replace(/-/g, '+').replace(/_/g, '/');
		const text = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
		return Uint8Array.from(text, (char) => char.charCodeAt(0));
	}

	const onIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
	const standalone = () =>
		matchMedia('(display-mode: standalone)').matches ||
		(navigator as Navigator & { standalone?: boolean }).standalone === true;

	onMount(async () => {
		if (sampleMode) {
			endpoint = SAMPLE_PHONE;
			settings = (await call('POST', { endpoint })).settings;
			stage = settings ? 'on' : 'off';
			return;
		}
		if (!pushKey) {
			stage = 'not-set-up';
			return;
		}
		if (
			!('serviceWorker' in navigator) ||
			!('PushManager' in window) ||
			!('Notification' in window)
		) {
			stage = onIOS() && !standalone() ? 'install' : 'unsupported';
			return;
		}
		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();
			if (subscription && Notification.permission === 'granted') {
				endpoint = subscription.endpoint;
				// The phone still has it: make sure the server does too (it's re-saved if not).
				const saved = subscription.toJSON();
				settings = (await call('POST', { ...saved, timeZone: timeZone() })).settings;
				stage = 'on';
				return;
			}
		} catch {
			// Fall through to the button.
		}
		stage = Notification.permission === 'denied' ? 'blocked' : 'off';
	});

	async function turnOn() {
		busy = true;
		note = null;
		try {
			if (sampleMode) {
				settings = (
					await call('POST', {
						endpoint: SAMPLE_PHONE,
						keys: { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) },
						timeZone: timeZone()
					})
				).settings;
				endpoint = SAMPLE_PHONE;
				stage = 'on';
				return;
			}
			// Asked straight from the tap: iOS shows nothing otherwise.
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				stage = permission === 'denied' ? 'blocked' : 'off';
				return;
			}
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: keyBytes(pushKey!)
			});
			endpoint = subscription.endpoint;
			settings = (await call('POST', { ...subscription.toJSON(), timeZone: timeZone() })).settings;
			stage = 'on';
		} catch (problem) {
			note =
				problem instanceof Error && problem.message
					? problem.message
					: 'Couldn’t turn them on. Try again in a moment.';
		} finally {
			busy = false;
		}
	}

	async function turnOff() {
		busy = true;
		note = null;
		try {
			if (!sampleMode) {
				const registration = await navigator.serviceWorker.ready;
				await (await registration.pushManager.getSubscription())?.unsubscribe();
			}
			if (endpoint) await call('DELETE', { endpoint });
			settings = null;
			stage = 'off';
		} catch {
			note = 'Couldn’t turn them off. Try again in a moment.';
		} finally {
			busy = false;
		}
	}

	async function save(next: PhoneSettings) {
		if (!endpoint) return;
		const before = settings;
		settings = next;
		try {
			settings = (await call('PUT', { endpoint, ...next })).settings;
		} catch {
			settings = before;
			note = 'Couldn’t save that. Try again in a moment.';
		}
	}

	function toggleGroup(group: NotificationGroup, on: boolean) {
		if (!settings) return;
		const groups = on
			? [...settings.groups, group]
			: settings.groups.filter((value) => value !== group);
		void save({ ...settings, groups });
	}

	function toggleQuiet(on: boolean) {
		if (!settings) return;
		void save({ ...settings, quietFrom: on ? 22 : null, quietTo: on ? 7 : null });
	}
</script>

<section class="notification-settings" id="notifications" aria-labelledby="notifications-heading">
	<h2 id="notifications-heading" class="section-label caption-label">Notifications</h2>

	{#if stage === 'on' && settings}
		<ul class="grouped">
			{#each NOTIFICATION_GROUPS as group (group.value)}
				<li>
					<label class="grouped-row switch-row">
						<span class="grouped-label"
							>{group.label}<span class="grouped-sub">{group.detail}</span></span
						>
						<input
							class="hidden-input"
							type="checkbox"
							role="switch"
							checked={settings.groups.includes(group.value)}
							onchange={(event) => toggleGroup(group.value, event.currentTarget.checked)}
						/>
						<span class="switch" aria-hidden="true"></span>
					</label>
				</li>
			{/each}
		</ul>

		<ul class="grouped quiet">
			<li>
				<label class="grouped-row switch-row">
					<span class="grouped-label"
						>Quiet hours<span class="grouped-sub"
							>They wait on Home instead of buzzing your phone</span
						></span
					>
					<input
						class="hidden-input"
						type="checkbox"
						role="switch"
						checked={settings.quietFrom !== null}
						onchange={(event) => toggleQuiet(event.currentTarget.checked)}
					/>
					<span class="switch" aria-hidden="true"></span>
				</label>
			</li>
			{#if settings.quietFrom !== null && settings.quietTo !== null}
				<li class="grouped-row hours">
					<label
						>From
						<select
							class="field-input"
							value={settings.quietFrom}
							onchange={(event) =>
								save({ ...settings!, quietFrom: Number(event.currentTarget.value) })}
						>
							{#each HOURS as hour (hour)}<option value={hour}>{hourLabel(hour)}</option>{/each}
						</select>
					</label>
					<label
						>Until
						<select
							class="field-input"
							value={settings.quietTo}
							onchange={(event) =>
								save({ ...settings!, quietTo: Number(event.currentTarget.value) })}
						>
							{#each HOURS as hour (hour)}<option value={hour}>{hourLabel(hour)}</option>{/each}
						</select>
					</label>
				</li>
			{/if}
		</ul>

		<div class="actions">
			<button class="button-quiet" type="button" disabled={busy} onclick={turnOff}
				>Turn off on this phone</button
			>
		</div>
		<p class="sub">Just for this phone. Everyone in your home chooses their own.</p>
	{:else}
		<div class="pitch">
			<p class="pitch-title">Hear about it when it happens</p>
			<p class="sub">
				Friend requests, postcards, replies, invites and money, on your lock screen. Everything also
				waits for you at the top of Home.
			</p>
			{#if stage === 'off'}
				<button class="button-primary" type="button" disabled={busy} onclick={turnOn}
					>Turn on notifications</button
				>
			{:else if stage === 'blocked'}
				<p class="sub">
					They’re turned off for home base in your phone’s Settings, under Notifications. Turn them
					on there, then come back.
				</p>
			{:else if stage === 'install'}
				<p class="sub">
					Add home base to your Home Screen first (Share, then Add to Home Screen), and open it from
					there.
				</p>
			{:else if stage === 'unsupported'}
				<p class="sub">This browser can’t show notifications.</p>
			{:else if stage === 'not-set-up'}
				<p class="sub">Notifications aren’t set up on the server yet.</p>
			{/if}
		</div>
	{/if}

	{#if note}<p class="note" role="status">{note}</p>{/if}
</section>

<style>
	.notification-settings {
		margin-bottom: var(--space-xl);
	}

	.quiet {
		margin-top: var(--space-m);
	}

	.hours {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-s);
	}

	.hours label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: var(--text-caption);
		color: var(--colour-text-muted);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-s);
		margin-top: var(--space-m);
	}

	.pitch {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-s);
		padding: 18px;
		border-radius: 16px;
		background: var(--colour-fill);
		box-shadow: inset 0 0 0 var(--hairline) var(--colour-separator);
	}

	.pitch-title {
		margin: 0;
		font-weight: var(--weight-strong);
	}

	.sub {
		margin: 0;
		font-size: var(--text-small);
		color: var(--colour-text-muted);
	}

	.actions + .sub {
		margin-top: var(--space-s);
	}

	.note {
		margin: var(--space-s) 0 0;
		font-size: var(--text-small);
	}
</style>
