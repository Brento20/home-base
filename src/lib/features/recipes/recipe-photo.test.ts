import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPage, fetchPhoto, isPublicUrl, photoLinkIn } from './recipe-page.js';

const page = new URL('https://www.example.com/recipes/risotto');

describe('photoLinkIn', () => {
	it('takes the recipe data’s image, in any of its shapes', () => {
		expect(photoLinkIn('', { image: 'https://cdn.example.com/a.jpg' }, page)?.href).toBe(
			'https://cdn.example.com/a.jpg'
		);
		expect(
			photoLinkIn(
				'',
				{ image: ['https://cdn.example.com/1.jpg', 'https://cdn.example.com/2.jpg'] },
				page
			)?.href
		).toBe('https://cdn.example.com/1.jpg');
		expect(
			photoLinkIn(
				'',
				{
					image: [{ '@type': 'ImageObject', url: 'https://cdn.example.com/obj.jpg', width: 1200 }]
				},
				page
			)?.href
		).toBe('https://cdn.example.com/obj.jpg');
	});

	it('falls back to the picture the page shares, either way round', () => {
		const html = `<head><meta content="https://cdn.example.com/og.jpg" property="og:image"></head>`;
		expect(photoLinkIn(html, null, page)?.href).toBe('https://cdn.example.com/og.jpg');
		const twitter = `<meta name='twitter:image' content='/img/tw.jpg'>`;
		expect(photoLinkIn(twitter, { name: 'No image here' }, page)?.href).toBe(
			'https://www.example.com/img/tw.jpg'
		);
	});

	it('resolves relative links and decodes entities', () => {
		expect(photoLinkIn('', { image: '/a.jpg?w=1200&amp;h=800' }, page)?.href).toBe(
			'https://www.example.com/a.jpg?w=1200&h=800'
		);
	});

	it('never points into a private network, and skips non-links', () => {
		expect(photoLinkIn('', { image: 'http://127.0.0.1/a.jpg' }, page)).toBeNull();
		expect(photoLinkIn('', { image: 'http://192.168.1.4/a.jpg' }, page)).toBeNull();
		expect(photoLinkIn('', { image: 'file:///etc/passwd' }, page)).toBeNull();
		expect(
			photoLinkIn(
				'<meta property="og:image" content="https://cdn.example.com/og.jpg">',
				{ image: 'http://localhost/a.jpg' },
				page
			)?.href
		).toBe('https://cdn.example.com/og.jpg');
		expect(photoLinkIn('<p>No pictures</p>', null, page)).toBeNull();
	});
});

describe('isPublicUrl', () => {
	it('allows the open web only', () => {
		expect(isPublicUrl(new URL('https://www.taste.com.au/x'))).toBe(true);
		expect(isPublicUrl(new URL('http://10.0.0.2/x'))).toBe(false);
		expect(isPublicUrl(new URL('http://172.20.1.1/x'))).toBe(false);
		expect(isPublicUrl(new URL('http://[::1]/x'))).toBe(false);
		expect(isPublicUrl(new URL('http://printer.local/x'))).toBe(false);
		expect(isPublicUrl(new URL('ftp://example.com/x'))).toBe(false);
	});
});

describe('fetchPhoto', () => {
	const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
	const respond = (body: BodyInit | null, headers: Record<string, string>, url = '') => {
		const response = new Response(body, { headers });
		Object.defineProperty(response, 'url', { value: url });
		return response;
	};
	afterEach(() => vi.unstubAllGlobals());

	it('brings back an image as a data URL', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				respond(jpeg, { 'content-type': 'image/jpeg' }, 'https://cdn.example.com/a.jpg')
			)
		);
		expect(await fetchPhoto(new URL('https://cdn.example.com/a.jpg'))).toBe(
			'data:image/jpeg;base64,/9j/4AECAw=='
		);
	});

	it('turns down pages, odd types, huge files and redirects into a private network', async () => {
		const cases = [
			respond('<html></html>', { 'content-type': 'text/html' }),
			respond(jpeg, { 'content-type': 'image/svg+xml' }),
			respond(jpeg, { 'content-type': 'image/jpeg', 'content-length': String(20 * 1024 * 1024) }),
			respond(jpeg, { 'content-type': 'image/jpeg' }, 'http://192.168.0.10/a.jpg')
		];
		for (const response of cases) {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => response)
			);
			expect(await fetchPhoto(new URL('https://cdn.example.com/a.jpg'))).toBeNull();
		}
	});
});

describe('fetchPage', () => {
	afterEach(() => vi.unstubAllGlobals());
	const answer = (body: string, status: number, type = 'text/html; charset=utf-8') =>
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(body, { status, headers: { 'content-type': type } }))
		);
	const url = new URL('https://www.example.com/recipes/x');

	it('reads a page', async () => {
		answer('<html><h1>Risotto</h1></html>', 200);
		expect(await fetchPage(url)).toEqual({ html: '<html><h1>Risotto</h1></html>' });
	});

	it('knows when a site turns the app away, even behind a 200', async () => {
		answer('Access Denied', 403);
		expect(await fetchPage(url)).toEqual({ problem: 'blocked' });
		answer('<html><title>Are you a robot?</title></html>', 200);
		expect(await fetchPage(url)).toEqual({ problem: 'blocked' });
	});

	it('tells unreachable pages and non-pages apart', async () => {
		answer('gone', 404);
		expect(await fetchPage(url)).toEqual({ problem: 'unreachable' });
		answer('%PDF', 200, 'application/pdf');
		expect(await fetchPage(url)).toEqual({ problem: 'not-a-page' });
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Promise.reject(new Error('timeout')))
		);
		expect(await fetchPage(url)).toEqual({ problem: 'unreachable' });
	});
});
