import { describe, expect, it } from 'vitest';
import {
	describeNotification,
	groupOf,
	isPushEndpoint,
	type NotificationFacts,
	type NotificationKind
} from './describe.js';

const facts = (
	kind: NotificationKind,
	extra: Partial<NotificationFacts> = {}
): NotificationFacts => ({
	kind,
	actorName: 'Chris',
	subject: '',
	detail: '',
	place: '',
	amountCents: null,
	currency: null,
	startsAt: null,
	...extra
});

const say = (kind: NotificationKind, extra: Partial<NotificationFacts> = {}) =>
	describeNotification(facts(kind, extra), 'Australia/Sydney');

describe('describeNotification', () => {
	it('words friends', () => {
		expect(say('friend_request')).toEqual({
			title: 'Chris wants to be friends',
			body: 'Say yes or no.'
		});
		expect(say('friend_accepted').title).toBe('You and Chris are friends now');
	});

	it('words postcards, replies and reacts', () => {
		expect(say('postcard', { subject: 'Figs are ripe' })).toEqual({
			title: 'Postcard from Chris',
			body: 'Figs are ripe'
		});
		expect(say('postcard_reply', { detail: 'yours' }).title).toBe('Chris replied to your postcard');
		expect(say('postcard_reply').title).toBe('Chris wrote back');
		expect(say('postcard_reaction', { detail: 'heart' }).title).toBe('Chris loved your postcard');
		expect(say('feed_reaction', { detail: 'thanks' }).title).toBe(
			'Chris said thanks for your post'
		);
		expect(say('feed_reaction', { detail: 'laugh' }).title).toBe('Chris laughed at your post');
		expect(say('feed_reply', { detail: 'yours' }).title).toBe('Chris replied to your post');
		expect(say('feed_reply', { detail: 'thread' }).title).toBe('Chris also replied');
		expect(say('feed_post').body).toBe('A photo.');
	});

	it('words plans in the reader’s time zone', () => {
		const startsAt = '2026-12-06T02:00:00.000Z'; // 1 pm Sunday in Sydney
		expect(say('plan_invite', { subject: 'Long lunch', place: 'The Terrace', startsAt })).toEqual({
			title: 'Chris invited you to Long lunch',
			body: 'The Terrace · Sunday 6 Dec, 1:00 pm'
		});
		expect(say('plan_response', { subject: 'Long lunch', detail: 'going', startsAt }).title).toBe(
			'Chris’s coming to Long lunch'
		);
		expect(say('plan_response', { subject: 'Long lunch', detail: 'not_going' }).title).toBe(
			'Chris can’t make Long lunch'
		);
		expect(
			describeNotification(facts('plan_invite', { subject: 'Call', startsAt }), 'Europe/London')
				.body
		).toBe('Sunday 6 Dec, 2:00 am');
	});

	it('words money in the home’s currency', () => {
		expect(
			say('expense', {
				subject: 'Groceries',
				amountCents: 12000,
				currency: 'AUD',
				place: 'Our Place'
			})
		).toEqual({ title: 'Chris added Groceries', body: '$120.00 in Our Place' });
		expect(say('settlement', { detail: 'to_you', amountCents: 5000, currency: 'GBP' }).title).toBe(
			'Chris paid you £50.00'
		);
		expect(
			say('settlement', { detail: 'from_you', amountCents: 5000, currency: 'AUD' }).title
		).toBe('Chris marked your $50.00 as paid');
	});

	it('words a job with its due day', () => {
		expect(
			say('task_assigned', { subject: 'Vacuum the lounge', startsAt: '2026-12-03T00:00:00.000Z' })
		).toEqual({ title: 'Chris gave you a job', body: 'Vacuum the lounge, due Thursday 3 Dec' });
		expect(say('task_assigned', { subject: 'Bins' }).body).toBe('Bins');
	});

	it('names someone it can’t name', () => {
		expect(say('postcard', { actorName: '' }).title).toBe('Postcard from Someone');
	});
});

describe('groupOf', () => {
	it('matches the database’s notification_group', () => {
		expect(groupOf('friend_request')).toBe('friends');
		expect(groupOf('postcard_reaction')).toBe('postcards');
		expect(groupOf('feed_reply')).toBe('posts');
		expect(groupOf('plan_invite')).toBe('plans');
		expect(groupOf('settlement')).toBe('money');
		expect(groupOf('task_assigned')).toBe('jobs');
	});
});

describe('isPushEndpoint', () => {
	it('allows the push services, and nothing else', () => {
		expect(isPushEndpoint('https://web.push.apple.com/QGx2')).toBe(true);
		expect(isPushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
		expect(isPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true);
		expect(isPushEndpoint('http://web.push.apple.com/x')).toBe(false);
		expect(isPushEndpoint('https://evil.example.com/push.apple.com')).toBe(false);
		expect(isPushEndpoint('https://push.apple.com.evil.example/x')).toBe(false);
		expect(isPushEndpoint('https://169.254.169.254/latest')).toBe(false);
		expect(isPushEndpoint('not a url')).toBe(false);
	});
});
